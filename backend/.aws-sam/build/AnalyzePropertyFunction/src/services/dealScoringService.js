import {
	formatCurrency,
	round,
} from "../utils/numberUtils.js";

const DEAL_THRESHOLDS = {
	exceptional: 85,
	promising: 75,
	decent: 60,
	review: 45,

	strongCashFlow: 200,
	strongDSCR: 1.15,
	strongCapRate: 5.5,
};

export function calculateDealScore(property) {
	const result = calculateDealScoreWithBreakdown(property);
	return result.score;
}

export function calculateDealScoreWithBreakdown(property) {
	let score = 40;
	const breakdown = [];

	const estimatedValue = property.estimated_value || 0;
	const listPrice = property.list_price || 0;
	const sqft = property.sqft || 0;
	const pricePerSqft = property.price_per_sqft || 0;
	const yearBuilt = property.year_built || 0;
	const compsCount = property.valuation?.comparables_count || 0;
	const valueLow = property.valuation?.value_low || 0;
	const valueHigh = property.valuation?.value_high || 0;
	const estimatedRent = property.estimated_rent || 0;
	const rentToValueRatio = property.rent_to_value_ratio || 0;

	breakdown.push({
		category: "base_score",
		points: 40,
		reason: "Starting baseline score",
	});

	if (estimatedValue && listPrice) {
		const discountPercent =
			((estimatedValue - listPrice) / estimatedValue) * 100;

		let points = 0;
		let reason = "";

		if (discountPercent >= 15) {
			points = 18;
			reason = "Property appears priced well below estimated value";
		} else if (discountPercent >= 10) {
			points = 14;
			reason = "Property appears priced below estimated value";
		} else if (discountPercent >= 5) {
			points = 8;
			reason = "Property appears slightly below estimated value";
		} else if (discountPercent >= 0) {
			points = 3;
			reason = "Property is priced close to estimated value";
		} else if (discountPercent < -10) {
			points = -15;
			reason = "Property appears significantly overpriced";
		} else {
			points = -8;
			reason = "Property appears slightly overpriced";
		}

		score += points;

		breakdown.push({
			category: "price_vs_estimated_value",
			points,
			discount_percent: round(discountPercent),
			reason,
		});
	}

	if (pricePerSqft > 0) {
		let points = 0;
		let reason = "";

		if (pricePerSqft < 150) {
			points = 8;
			reason = "Price per square foot is relatively low";
		} else if (pricePerSqft < 250) {
			points = 4;
			reason = "Price per square foot is moderate";
		} else if (pricePerSqft > 400) {
			points = -8;
			reason = "Price per square foot is high";
		} else {
			reason = "Price per square foot is neutral";
		}

		score += points;

		breakdown.push({
			category: "price_per_sqft",
			points,
			price_per_sqft: round(pricePerSqft),
			reason,
		});
	}

	let compsPoints = 0;
	let compsReason = "";

	if (compsCount >= 5) {
		compsPoints = 6;
		compsReason = "Comparable property support is strong";
	} else if (compsCount >= 3) {
		compsPoints = 3;
		compsReason = "Comparable property support is moderate";
	} else if (compsCount > 0) {
		compsPoints = 1;
		compsReason = "Comparable property support is limited";
	} else {
		compsPoints = -6;
		compsReason = "No comparable property support is available";
	}

	score += compsPoints;

	breakdown.push({
		category: "comparables",
		points: compsPoints,
		comparables_count: compsCount,
		reason: compsReason,
	});

	if (estimatedValue && valueLow && valueHigh) {
		const rangeSpreadPercent =
			((valueHigh - valueLow) / estimatedValue) * 100;

		let points = 0;
		let reason = "";

		if (rangeSpreadPercent <= 20) {
			points = 6;
			reason = "Valuation range is tight";
		} else if (rangeSpreadPercent <= 35) {
			points = 3;
			reason = "Valuation range is acceptable";
		} else if (rangeSpreadPercent > 50) {
			points = -8;
			reason = "Valuation range is wide";
		} else {
			reason = "Valuation range is neutral";
		}

		score += points;

		breakdown.push({
			category: "valuation_confidence",
			points,
			range_spread_percent: round(rangeSpreadPercent),
			reason,
		});
	}

	const currentYear = new Date().getFullYear();

	if (yearBuilt) {
		const age = currentYear - yearBuilt;

		let points = 0;
		let reason = "";

		if (age <= 15) {
			points = 5;
			reason = "Property is relatively new";
		} else if (age <= 40) {
			points = 2;
			reason = "Property age is moderate";
		} else if (age >= 70) {
			points = -6;
			reason = "Older property may require more maintenance";
		} else {
			reason = "Property age is neutral";
		}

		score += points;

		breakdown.push({
			category: "property_age",
			points,
			year_built: yearBuilt,
			age,
			reason,
		});
	}

	if (sqft > 0) {
		let points = 0;
		let reason = "";

		if (sqft >= 1200 && sqft <= 3000) {
			points = 3;
			reason = "Property size is within a common residential range";
		} else if (sqft < 800) {
			points = -4;
			reason = "Property size is relatively small";
		} else {
			reason = "Property size is neutral";
		}

		score += points;

		breakdown.push({
			category: "property_size",
			points,
			sqft,
			reason,
		});
	}

	if (estimatedRent > 0 && rentToValueRatio > 0) {
		let points = 0;
		let reason = "";

		if (rentToValueRatio >= 0.12) {
			points = 10;
			reason = "Rental yield is very strong";
		} else if (rentToValueRatio >= 0.1) {
			points = 8;
			reason = "Rental yield is strong";
		} else if (rentToValueRatio >= 0.08) {
			points = 5;
			reason = "Rental yield is solid";
		} else if (rentToValueRatio >= 0.06) {
			points = 2;
			reason = "Rental yield is moderate";
		} else if (rentToValueRatio < 0.04) {
			points = -8;
			reason = "Rental yield is weak";
		} else {
			reason = "Rental yield is neutral";
		}

		score += points;

		breakdown.push({
			category: "rental_yield",
			points,
			estimated_rent: estimatedRent,
			rent_to_value_ratio: round(rentToValueRatio * 100),
			reason,
		});
	}

	const finalScore = Math.max(0, Math.min(Math.round(score), 100));

	return {
		score: finalScore,
		breakdown,
	};
}

export function getRecommendation(score) {
	if (score >= DEAL_THRESHOLDS.exceptional) {
		return "Exceptional lead";
	}

	if (score >= DEAL_THRESHOLDS.promising) {
		return "Promising lead";
	}

	if (score >= DEAL_THRESHOLDS.decent) {
		return "Decent lead";
	}

	if (score >= DEAL_THRESHOLDS.review) {
		return "Needs deeper analysis";
	}

	return "Weak lead based on current data";
}

export function generateInvestmentSummary(property) {
	const baseCase = property.investment_scenarios?.base_case;

	if (baseCase) {
		return generateUnderwritingAwareSummary(property, baseCase);
	}

	return generateLeadSummary(property);
}

function generateUnderwritingAwareSummary(property, baseCase) {
	const cashFlow = baseCase.monthly_numbers?.cash_flow ?? 0;
	const dscr = baseCase.return_metrics?.dscr ?? 0;
	const capRate = baseCase.return_metrics?.cap_rate ?? 0;
	const estimatedRent = property.estimated_rent || 0;

	if (cashFlow < 0 || dscr < 1) {
		return `This deal currently fails underwriting. Monthly cash flow is ${formatCurrency(
			cashFlow
		)}, DSCR is ${round(dscr)}, and cap rate is ${round(
			capRate
		)}%. Estimated rent is approximately ${formatCurrency(
			estimatedRent
		)}/month. The property may still be worth monitoring only if pricing, rent, financing, taxes, or insurance improve.`;
	}

	if (
		cashFlow >= DEAL_THRESHOLDS.strongCashFlow &&
		dscr >= DEAL_THRESHOLDS.strongDSCR &&
		capRate >= DEAL_THRESHOLDS.strongCapRate
	) {
		return `This deal appears financially workable under the current assumptions. Monthly cash flow is ${formatCurrency(
			cashFlow
		)}, DSCR is ${round(dscr)}, and cap rate is ${round(
			capRate
		)}%. Continue due diligence on rent comps, taxes, insurance, repairs, vacancy, and neighborhood risk.`;
	}

	return `This property has mixed investment signals. Monthly cash flow is ${formatCurrency(
		cashFlow
	)}, DSCR is ${round(dscr)}, and cap rate is ${round(
		capRate
	)}%. Keep it on the watchlist, but do not treat it as a strong buy without better terms or stronger rent evidence.`;
}

function generateLeadSummary(property) {
	const score = property.deal_score || 0;
	const estimatedRent = property.estimated_rent || 0;
	const pricePerSqft = property.price_per_sqft || 0;
	const rentRatio = property.rent_to_value_ratio || 0;
	const estimatedValue = property.estimated_value || 0;
	const valueLow = property.valuation?.value_low || 0;
	const valueHigh = property.valuation?.value_high || 0;
	const compsCount = property.valuation?.comparables_count || 0;

	const strengths = [];
	const cautions = [];

	if (rentRatio >= 0.08) {
		strengths.push("solid rental potential");
	} else if (rentRatio > 0 && rentRatio < 0.06) {
		cautions.push("weaker rental yield");
	}

	if (pricePerSqft > 0 && pricePerSqft < 150) {
		strengths.push("a relatively low price per square foot");
	} else if (pricePerSqft > 300) {
		cautions.push("a high price per square foot");
	}

	if (compsCount >= 5) {
		strengths.push("strong comparable property support");
	} else if (compsCount > 0 && compsCount < 3) {
		cautions.push("limited comparable property support");
	}

	if (estimatedValue && valueLow && valueHigh) {
		const spreadPercent =
			((valueHigh - valueLow) / estimatedValue) * 100;

		if (spreadPercent > 45) {
			cautions.push("a wide valuation range");
		}
	}

	let summary = "Based on available property and rental data, ";

	if (strengths.length > 0 && cautions.length > 0) {
		summary += `this property has ${formatList(
			strengths
		)}, but ${formatList(cautions)} should be reviewed.`;
	} else if (strengths.length > 0) {
		summary += `this property shows ${formatList(strengths)}.`;
	} else if (cautions.length > 0) {
		summary += `this property has ${formatList(cautions)}.`;
	} else {
		summary +=
			"there is not enough strong signal yet to classify this as a clear lead.";
	}

	if (estimatedRent > 0) {
		summary += ` Estimated rent is approximately ${formatCurrency(
			estimatedRent
		)}/month.`;
	}

	if (score >= DEAL_THRESHOLDS.exceptional) {
		summary +=
			" This appears to be an exceptional lead, but due diligence is still required.";
	} else if (score >= DEAL_THRESHOLDS.promising) {
		summary +=
			" This appears to be a promising lead for further analysis.";
	} else if (score >= DEAL_THRESHOLDS.decent) {
		summary +=
			" This appears to be a decent lead, but more due diligence is needed.";
	} else if (score >= DEAL_THRESHOLDS.review) {
		summary += " More financial and market analysis is recommended.";
	} else {
		summary +=
			" This does not appear to be a strong lead based on current data.";
	}

	return summary;
}

function formatList(items) {
	if (items.length === 1) return items[0];

	if (items.length === 2) {
		return `${items[0]} and ${items[1]}`;
	}

	return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}