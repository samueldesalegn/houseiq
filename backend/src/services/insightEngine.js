import {
	formatCurrency,
	round,
} from "../utils/numberUtils.js";

export function buildHiddenInsights(property, baseCase) {
	if (!baseCase) {
		return {
			hidden_insights: [],
			action_plan: [],
		};
	}

	const insights = [];
	const actions = [];

	const cashFlow = baseCase.monthly_numbers?.cash_flow ?? 0;
	const dscr = baseCase.return_metrics?.dscr ?? 0;
	const capRate = baseCase.return_metrics?.cap_rate ?? 0;

	const mortgage = baseCase.monthly_numbers?.mortgage ?? 0;
	const rent = baseCase.monthly_numbers?.estimated_rent ?? 0;
	const tax = baseCase.monthly_numbers?.property_tax ?? 0;
	const insurance = baseCase.monthly_numbers?.insurance ?? 0;
	const maintenance = baseCase.monthly_numbers?.maintenance ?? 0;
	const vacancy = baseCase.monthly_numbers?.vacancy ?? 0;
	const management =
		baseCase.monthly_numbers?.property_management ?? 0;

	const breakEvenRent =
		property.sensitivity_analysis?.break_even_monthly_rent;

	const breakEvenPrice =
		property.sensitivity_analysis?.break_even_purchase_price;

	const maxRate =
		property.sensitivity_analysis
			?.max_interest_rate_for_positive_cashflow;

	const minDown =
		property.sensitivity_analysis
			?.minimum_down_payment_percent;

	if (cashFlow < 0) {
		insights.push(
			`This property loses ${formatCurrency(
				Math.abs(cashFlow)
			)}/month under the base case.`
		);
	}

	if (dscr < 1) {
		insights.push(
			`DSCR is ${round(
				dscr
			)}, meaning rent does not fully cover debt service.`
		);
	}

	if (capRate < 5.5) {
		insights.push(
			`Cap rate is ${round(
				capRate
			)}%, which is weak for a cash-flow strategy.`
		);
	}

	if (rent > 0 && mortgage / rent > 0.65) {
		insights.push(
			`Mortgage consumes ${Math.round(
				(mortgage / rent) * 100
			)}% of estimated rent before taxes, insurance, vacancy, repairs, and management.`
		);
	}

	if (rent > 0 && tax / rent > 0.2) {
		insights.push(
			`Property tax consumes ${Math.round(
				(tax / rent) * 100
			)}% of estimated rent, which is heavy for a rental.`
		);
	}

	const operatingDrag =
		tax + insurance + maintenance + vacancy + management;

	if (rent > 0 && operatingDrag / rent > 0.4) {
		insights.push(
			`Operating costs consume ${Math.round(
				(operatingDrag / rent) * 100
			)}% of estimated rent before debt service.`
		);
	}

	if (property.deal_resilience?.rating === "highly fragile") {
		insights.push(
			"The deal is already fragile before adding real-world shocks like higher insurance, longer vacancy, or major repairs."
		);
	}

	if (breakEvenPrice) {
		actions.push(
			`Do not pay current estimated value unless terms change. Target price should be near or below ${formatCurrency(
				breakEvenPrice
			)}.`
		);
	}

	if (breakEvenRent) {
		actions.push(
			`Verify whether market rent can realistically reach at least ${formatCurrency(
				breakEvenRent
			)}/month just to break even.`
		);
	}

	if (maxRate) {
		actions.push(
			`At the current structure, interest rate likely needs to be around ${maxRate}% or lower for positive cash flow.`
		);
	}

	if (minDown) {
		actions.push(
			`Base case may require approximately ${minDown}% down payment to avoid negative cash flow.`
		);
	}

	if (cashFlow < 0 || dscr < 1) {
		actions.push(
			"Treat this as a pass unless price, rent, financing, or operating assumptions materially improve."
		);
	}

	return {
		hidden_insights: insights,
		action_plan: actions,
	};
}

export function buildDealExplanation(property, baseCase) {
	if (!baseCase) {
		return {
			classification: "unknown",
			why_good: [],
			why_moderate: [],
			why_risky: ["Insufficient underwriting data."],
			final_verdict: "Not enough data to classify this deal.",
		};
	}

	const whyGood = [];
	const whyModerate = [];
	const whyRisky = [];

	const cashFlow = baseCase.monthly_numbers?.cash_flow ?? 0;
	const dscr = baseCase.return_metrics?.dscr ?? 0;
	const capRate = baseCase.return_metrics?.cap_rate ?? 0;
	const cashOnCash =
		baseCase.return_metrics?.cash_on_cash_return ?? 0;

	const optimistic =
		property.investment_scenarios?.optimistic_case;

	const conservative =
		property.investment_scenarios?.conservative_case;

	const breakEvenRent =
		property.sensitivity_analysis?.break_even_monthly_rent ?? 0;

	const estimatedRent = property.estimated_rent ?? 0;

	if (cashFlow >= 300) {
		whyGood.push(
			`Base case produces strong monthly cash flow of ${formatCurrency(
				cashFlow
			)}.`
		);
	} else if (cashFlow > 0) {
		whyModerate.push(
			`Base case cash flow is positive but modest at ${formatCurrency(
				cashFlow
			)}.`
		);
	} else {
		whyRisky.push(
			`Base case cash flow is negative at ${formatCurrency(
				cashFlow
			)}.`
		);
	}

	if (dscr >= 1.25) {
		whyGood.push(
			`DSCR is ${round(
				dscr
			)}, which gives strong debt-service coverage.`
		);
	} else if (dscr >= 1) {
		whyModerate.push(
			`DSCR is ${round(
				dscr
			)}, which covers debt but leaves limited safety margin.`
		);
	} else {
		whyRisky.push(
			`DSCR is ${round(
				dscr
			)}, meaning income does not cover debt service.`
		);
	}

	if (capRate >= 7) {
		whyGood.push(
			`Cap rate is ${round(
				capRate
			)}%, which is strong for a rental deal.`
		);
	} else if (capRate >= 5.5) {
		whyModerate.push(
			`Cap rate is ${round(
				capRate
			)}%, which is acceptable but not outstanding.`
		);
	} else {
		whyRisky.push(
			`Cap rate is ${round(
				capRate
			)}%, which is weak for a cash-flow strategy.`
		);
	}

	if (cashOnCash >= 8) {
		whyGood.push(
			`Cash-on-cash return is ${round(
				cashOnCash
			)}%, which is attractive.`
		);
	} else if (cashOnCash > 0) {
		whyModerate.push(
			`Cash-on-cash return is positive but low at ${round(
				cashOnCash
			)}%.`
		);
	} else {
		whyRisky.push(
			`Cash-on-cash return is negative at ${round(
				cashOnCash
			)}%.`
		);
	}

	if (estimatedRent > 0 && breakEvenRent > 0) {
		if (estimatedRent >= breakEvenRent * 1.1) {
			whyGood.push(
				"Estimated rent is comfortably above break-even rent."
			);
		} else if (estimatedRent >= breakEvenRent) {
			whyModerate.push(
				"Estimated rent is near break-even, leaving limited margin."
			);
		} else {
			whyRisky.push(
				`Estimated rent is below break-even rent. Rent is about ${formatCurrency(
					estimatedRent
				)}, while break-even rent is about ${formatCurrency(
					breakEvenRent
				)}.`
			);
		}
	}

	if (optimistic?.monthly_numbers?.cash_flow > 0) {
		whyModerate.push(
			"Optimistic case can work, but it depends on better financing, lower expenses, or stronger assumptions."
		);
	}

	if (conservative?.monthly_numbers?.cash_flow < 0) {
		whyRisky.push(
			`Conservative case fails with ${formatCurrency(
				conservative.monthly_numbers.cash_flow
			)} monthly cash flow.`
		);
	} else if (conservative?.monthly_numbers?.cash_flow > 0) {
		whyGood.push(
			"Conservative case still produces positive cash flow, which improves deal resilience."
		);
	}

	const resilienceRating = property.deal_resilience?.rating;

	if (resilienceRating === "highly fragile") {
		whyRisky.push(
			"Resilience rating is highly fragile, meaning small shocks can break the deal."
		);
	} else if (resilienceRating) {
		whyModerate.push(
			`Resilience rating is ${resilienceRating}.`
		);
	}

	let classification = "moderate";

	if (cashFlow < 0 || dscr < 1 || capRate < 5.5) {
		classification = "weak";
	} else if (
		cashFlow >= 300 &&
		dscr >= 1.25 &&
		capRate >= 7
	) {
		classification = "strong";
	}

	if (whyGood.length === 0) {
		whyGood.push(
			"No strong positive signals found under current assumptions."
		);
	}

	if (whyModerate.length === 0) {
		whyModerate.push(
			"No moderate signals identified under current assumptions."
		);
	}

	if (whyRisky.length === 0) {
		whyRisky.push(
			"No major risk signals found under current assumptions."
		);
	}

	return {
		classification,
		why_good: whyGood,
		why_moderate: whyModerate,
		why_risky: whyRisky,
		final_verdict: buildExplanationVerdict(classification),
	};
}

export function generateFinalSummary(property, analysis) {
	if (!analysis) {
		return property.investment_summary;
	}

	const cashFlow = analysis.monthly_numbers?.cash_flow ?? 0;
	const dscr = analysis.return_metrics?.dscr ?? 0;
	const capRate = analysis.return_metrics?.cap_rate ?? 0;

	if (cashFlow < 0 || dscr < 1) {
		return `This is not a buy under current assumptions. Estimated monthly cash flow is ${formatCurrency(
			cashFlow
		)}/month, DSCR is ${round(
			dscr
		)}, and cap rate is ${round(
			capRate
		)}%. The property may be interesting as a lead, but the numbers do not support a cash-flow purchase unless price, rent, financing, or expenses improve.`;
	}

	if (cashFlow >= 200 && dscr >= 1.15 && capRate >= 5.5) {
		return `This property appears financially workable under the current assumptions. Estimated monthly cash flow is ${formatCurrency(
			cashFlow
		)}/month, DSCR is ${round(
			dscr
		)}, and cap rate is ${round(
			capRate
		)}%. Continue due diligence on taxes, insurance, repairs, rent comps, and neighborhood risk.`;
	}

	return `This property has mixed investment signals. Estimated monthly cash flow is ${formatCurrency(
		cashFlow
	)}/month, DSCR is ${round(dscr)}, and cap rate is ${round(
		capRate
	)}%. It should stay on the watchlist, but it is not strong enough without better terms or stronger market evidence.`;
}

function buildExplanationVerdict(classification) {
	if (classification === "strong") {
		return "This deal appears strong under current assumptions, but still requires due diligence on rent comps, repairs, taxes, insurance, and neighborhood risk.";
	}

	if (classification === "moderate") {
		return "This deal has some workable signals, but the margin is thin. It should stay on the watchlist unless better terms or stronger rent evidence are confirmed.";
	}

	return "This deal is weak under current assumptions. It should be treated as a pass unless price, rent, financing, or operating expenses materially improve.";
}