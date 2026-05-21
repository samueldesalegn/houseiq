import { round } from "../utils/numberUtils.js";

export function formatPropertyAnalysisResponse(property, options = {}) {
	const includeDetails = options.include_details === true;

	const baseCase = property.investment_scenarios?.base_case;
	const optimisticCase = property.investment_scenarios?.optimistic_case;
	const conservativeCase = property.investment_scenarios?.conservative_case;

	const response = {
		summary: {
			buy_decision: property.buy_decision,
			recommendation: property.recommendation,
			deal_score: property.deal_score,
			final_summary: property.final_summary,
			key_blocker: property.sensitivity_analysis?.key_blocker,
			resilience_rating: property.deal_resilience?.rating,
			resilience_score: property.deal_resilience?.score,
		},

		property: {
			address: property.address,
			property_type: property.property_type,
			beds: property.beds,
			baths: property.baths,
			sqft: property.sqft,
			year_built: property.year_built,
			estimated_value: property.estimated_value,
			estimated_rent: property.estimated_rent,
			price_per_sqft: round(property.price_per_sqft),
			rent_to_value_ratio_percent: round(
				(property.rent_to_value_ratio || 0) * 100
			),
		},

		underwriting: baseCase
			? {
				purchase_price: baseCase.assumptions.purchase_price,
				down_payment_percent:
					baseCase.assumptions.down_payment_percent,
				interest_rate: baseCase.assumptions.interest_rate,
				monthly_cash_flow:
					baseCase.monthly_numbers.cash_flow,
				total_monthly_expenses:
					baseCase.monthly_numbers.total_expenses,
				cap_rate: baseCase.return_metrics.cap_rate,
				dscr: baseCase.return_metrics.dscr,
				cash_on_cash_return:
					baseCase.return_metrics.cash_on_cash_return,
			}
			: null,

		break_even: {
			break_even_monthly_rent:
				property.sensitivity_analysis?.break_even_monthly_rent,
			break_even_purchase_price:
				property.sensitivity_analysis?.break_even_purchase_price,
			max_interest_rate_for_positive_cashflow:
				property.sensitivity_analysis
					?.max_interest_rate_for_positive_cashflow,
			minimum_down_payment_percent:
				property.sensitivity_analysis
					?.minimum_down_payment_percent,
		},

		scenarios: {
			base: formatScenario(baseCase),
			optimistic: formatScenario(optimisticCase),
			conservative: formatScenario(conservativeCase),
		},

		resilience: property.deal_resilience
			? {
				rating: property.deal_resilience.rating,
				score: property.deal_resilience.score,
				interpretation:
					property.deal_resilience.interpretation,
				stress_tests:
					property.deal_resilience.stress_tests,
			}
			: null,

		hidden_insights: property.hidden_insights || [],
		action_plan: property.action_plan || [],
		deal_explanation: property.deal_explanation || null,

		data_sources: property.data_sources,
	};

	if (includeDetails) {
		response.details = {
			raw_property: property,
			score_breakdown: property.score_breakdown,
			valuation: property.valuation,
			rental_analysis: property.rental_analysis,
			investment_scenarios: property.investment_scenarios,
			sensitivity_analysis: property.sensitivity_analysis,
			deal_resilience: property.deal_resilience,
			hidden_insights: property.hidden_insights,
			action_plan: property.action_plan,
			deal_explanation: property.deal_explanation,
		};
	}

	return response;
}

function formatScenario(scenario) {
	if (!scenario) return null;

	return {
		decision: scenario.decision,
		cash_flow: scenario.monthly_numbers.cash_flow,
		dscr: scenario.return_metrics.dscr,
		cap_rate: scenario.return_metrics.cap_rate,
		cash_on_cash_return:
			scenario.return_metrics.cash_on_cash_return,
		monthly_expenses:
			scenario.monthly_numbers.total_expenses,
		assumptions: {
			purchase_price: scenario.assumptions.purchase_price,
			down_payment_percent:
				scenario.assumptions.down_payment_percent,
			interest_rate: scenario.assumptions.interest_rate,
			vacancy_percent: scenario.assumptions.vacancy_percent,
			maintenance_percent:
				scenario.assumptions.maintenance_percent,
			property_management_percent:
				scenario.assumptions.property_management_percent,
		},
	};
}