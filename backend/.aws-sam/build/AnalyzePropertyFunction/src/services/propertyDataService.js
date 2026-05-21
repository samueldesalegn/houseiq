import {
	getRentCastProperty,
	getRentCastValueEstimate,
	getRentCastRentEstimate,
} from "../providers/rentCastProvider.js";

import {
	calculateDealScoreWithBreakdown,
	getRecommendation,
	generateInvestmentSummary,
} from "./dealScoringService.js";

import { calculateInvestmentScenarios } from "./investmentAnalysisService.js";
import { calculateSensitivityAnalysis } from "./sensitivityAnalysisService.js";
import { calculateDealResilience } from "./dealResilienceService.js";

import {
	buildHiddenInsights,
	buildDealExplanation,
	generateFinalSummary,
} from "./insightEngine.js";

export async function getPropertyAnalysis({
	PK,
	SK,
	propertyId,
	address,
	assumptions = {},
}) {
	const rentCastProperty = await getRentCastProperty(address);

	const rentCastValuation = await safeGetValueEstimate(
		address,
		rentCastProperty
	);

	const rentCastRent = await safeGetRentEstimate(address, rentCastProperty);

	const estimatedValue = getEstimatedValue(rentCastValuation);
	const estimatedRent = getEstimatedRent(rentCastRent);

	const property = buildPropertyRecord({
		PK,
		SK,
		propertyId,
		address,
		rentCastProperty,
		rentCastValuation,
		rentCastRent,
		estimatedValue,
		estimatedRent,
	});

	applyScoring(property);
	applyInvestmentAnalysis(property, assumptions);
	applyInsightAnalysis(property);

	return property;
}

async function safeGetValueEstimate(address, rentCastProperty) {
	try {
		return await getRentCastValueEstimate(address, rentCastProperty);
	} catch (error) {
		console.warn("RentCast valuation unavailable:", error.message);
		return null;
	}
}

async function safeGetRentEstimate(address, rentCastProperty) {
	try {
		return await getRentCastRentEstimate(address, rentCastProperty);
	} catch (error) {
		console.warn("RentCast rent estimate unavailable:", error.message);
		return null;
	}
}

function getEstimatedValue(rentCastValuation) {
	return (
		rentCastValuation?.price ||
		rentCastValuation?.value ||
		rentCastValuation?.estimate ||
		0
	);
}

function getEstimatedRent(rentCastRent) {
	return (
		rentCastRent?.rent ||
		rentCastRent?.price ||
		rentCastRent?.estimate ||
		0
	);
}

function buildPropertyRecord({
	PK,
	SK,
	propertyId,
	address,
	rentCastProperty,
	rentCastValuation,
	rentCastRent,
	estimatedValue,
	estimatedRent,
}) {
	const squareFootage = rentCastProperty.squareFootage || 0;

	return {
		PK,
		SK,
		property_id: propertyId,
		address: rentCastProperty.formattedAddress || address,

		estimated_value: estimatedValue,
		list_price: estimatedValue,
		listing_status: "not_listed",

		beds: rentCastProperty.bedrooms || 0,
		baths: rentCastProperty.bathrooms || 0,
		sqft: squareFootage,

		year_built: rentCastProperty.yearBuilt || null,
		property_type: rentCastProperty.propertyType || null,
		days_on_market: 0,

		price_per_sqft:
			estimatedValue && squareFootage
				? estimatedValue / squareFootage
				: 0,

		estimated_rent: estimatedRent,

		rent_to_value_ratio:
			estimatedValue && estimatedRent
				? Number(((estimatedRent * 12) / estimatedValue).toFixed(4))
				: 0,

		valuation: formatValuation(rentCastValuation, estimatedValue),
		rental_analysis: formatRentalAnalysis(rentCastRent, estimatedRent),

		created_at: new Date().toISOString(),
		last_refreshed: new Date().toISOString(),

		data_sources: {
			rentcast_property: "active",
			rentcast_valuation: rentCastValuation ? "active" : "unavailable",
			rentcast_rent: rentCastRent ? "active" : "unavailable",
			zillow: "planned",
			realtor: "planned",
			attom: "planned",
		},
	};
}

function formatValuation(rentCastValuation, estimatedValue) {
	if (!rentCastValuation) return null;

	return {
		estimated_value: estimatedValue,
		value_low:
			rentCastValuation.priceRangeLow ||
			rentCastValuation.valueRangeLow ||
			null,
		value_high:
			rentCastValuation.priceRangeHigh ||
			rentCastValuation.valueRangeHigh ||
			null,
		confidence_score: rentCastValuation.confidenceScore || null,
		comparables_count:
			rentCastValuation.comparables?.length ||
			rentCastValuation.comps?.length ||
			0,
	};
}

function formatRentalAnalysis(rentCastRent, estimatedRent) {
	if (!rentCastRent) return null;

	return {
		estimated_rent: estimatedRent,
		rent_low:
			rentCastRent.rentRangeLow ||
			rentCastRent.priceRangeLow ||
			null,
		rent_high:
			rentCastRent.rentRangeHigh ||
			rentCastRent.priceRangeHigh ||
			null,
		comparables_count:
			rentCastRent.comparables?.length ||
			rentCastRent.comps?.length ||
			0,
	};
}

function applyScoring(property) {
	const scoring = calculateDealScoreWithBreakdown(property);

	property.deal_score = scoring.score;
	property.score_breakdown = scoring.breakdown;
	property.recommendation = getRecommendation(property.deal_score);
}

function applyInvestmentAnalysis(property, assumptions) {
	property.investment_scenarios = calculateInvestmentScenarios(
		property,
		assumptions
	);

	property.sensitivity_analysis = calculateSensitivityAnalysis(
		property,
		assumptions
	);

	property.deal_resilience = calculateDealResilience(property, assumptions);

	const baseCase = property.investment_scenarios?.base_case;

	applyUnderwritingTruth(property, baseCase);
}

function applyInsightAnalysis(property) {
	const baseCase = property.investment_scenarios?.base_case;

	property.investment_summary = generateInvestmentSummary(property);

	const intelligence = buildHiddenInsights(property, baseCase);

	property.hidden_insights = intelligence.hidden_insights;
	property.action_plan = intelligence.action_plan;

	property.deal_explanation = buildDealExplanation(property, baseCase);

	property.buy_decision = baseCase?.decision || "Insufficient data";
	property.final_summary = generateFinalSummary(property, baseCase);
}

function applyUnderwritingTruth(property, baseCase) {
	if (!baseCase) return;

	const cashFlow = baseCase.monthly_numbers?.cash_flow ?? 0;
	const dscr = baseCase.return_metrics?.dscr ?? 0;
	const capRate = baseCase.return_metrics?.cap_rate ?? 0;

	if (cashFlow < 0 || dscr < 1) {
		property.recommendation = "Weak lead";
		property.deal_score = Math.min(property.deal_score, 45);

		property.score_breakdown = [
			...(property.score_breakdown || []),
			{
				category: "underwriting_penalty",
				points: -20,
				reason:
					"Base-case underwriting is negative, so lead score is capped.",
			},
		];

		return;
	}

	if (cashFlow < 200 || dscr < 1.15 || capRate < 5.5) {
		property.recommendation = "Watchlist only";
		property.deal_score = Math.min(property.deal_score, 58);

		property.score_breakdown = [
			...(property.score_breakdown || []),
			{
				category: "thin_margin_penalty",
				points: -10,
				reason:
					"Deal has thin cash-flow, DSCR, or cap-rate margin.",
			},
		];

		return;
	}

	property.recommendation = getRecommendation(property.deal_score);
}