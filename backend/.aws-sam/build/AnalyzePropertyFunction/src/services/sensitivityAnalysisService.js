import { calculateInvestmentAnalysis } from "./investmentAnalysisService.js";
import { round } from "../utils/numberUtils.js";

export function calculateSensitivityAnalysis(property, assumptions = {}) {
	const baseAnalysis = calculateInvestmentAnalysis(property, assumptions);

	return {
		break_even_monthly_rent: calculateBreakEvenMonthlyRent(baseAnalysis),
		break_even_purchase_price: calculateBreakEvenPurchasePrice(
			property,
			assumptions
		),
		max_interest_rate_for_positive_cashflow:
			calculateMaxInterestRateForPositiveCashflow(
				property,
				assumptions
			),
		minimum_down_payment_percent:
			calculateMinimumDownPaymentForPositiveCashflow(
				property,
				assumptions
			),
		key_blocker: determineKeyBlocker(baseAnalysis),
	};
}

function calculateBreakEvenMonthlyRent(baseAnalysis) {
	const monthlyNumbers = baseAnalysis.monthly_numbers;

	return round(monthlyNumbers.total_expenses);
}

function calculateBreakEvenPurchasePrice(property, assumptions) {
	const estimatedValue = property.estimated_value || 0;
	const estimatedRent = property.estimated_rent || 0;

	if (!estimatedValue || !estimatedRent) return 0;

	let bestPrice = 0;

	for (
		let price = estimatedValue;
		price >= estimatedValue * 0.5;
		price -= 1000
	) {
		const analysis = calculateInvestmentAnalysis(property, {
			...assumptions,
			purchase_price: price,
		});

		if (
			analysis.monthly_numbers.cash_flow >= 0 &&
			analysis.return_metrics.dscr >= 1
		) {
			bestPrice = price;
			break;
		}
	}

	return round(bestPrice);
}

function calculateMaxInterestRateForPositiveCashflow(property, assumptions) {
	let maxRate = 0;

	for (let rate = 12; rate >= 3; rate -= 0.25) {
		const analysis = calculateInvestmentAnalysis(property, {
			...assumptions,
			interest_rate: rate,
		});

		if (
			analysis.monthly_numbers.cash_flow >= 0 &&
			analysis.return_metrics.dscr >= 1
		) {
			maxRate = rate;
			break;
		}
	}

	return round(maxRate, 2);
}

function calculateMinimumDownPaymentForPositiveCashflow(
	property,
	assumptions
) {
	let minimumDownPayment = 0;

	for (let downPayment = 5; downPayment <= 60; downPayment += 1) {
		const analysis = calculateInvestmentAnalysis(property, {
			...assumptions,
			down_payment_percent: downPayment,
		});

		if (
			analysis.monthly_numbers.cash_flow >= 0 &&
			analysis.return_metrics.dscr >= 1
		) {
			minimumDownPayment = downPayment;
			break;
		}
	}

	return minimumDownPayment;
}

function determineKeyBlocker(baseAnalysis) {
	const cashFlow = baseAnalysis.monthly_numbers.cash_flow;
	const dscr = baseAnalysis.return_metrics.dscr;
	const capRate = baseAnalysis.return_metrics.cap_rate;

	if (cashFlow < 0 && dscr < 1) {
		return "Monthly debt and operating expenses are too high relative to estimated rent";
	}

	if (cashFlow < 0) {
		return "Estimated rent does not cover projected monthly expenses";
	}

	if (dscr < 1) {
		return "Net operating income is too low relative to debt service";
	}

	if (capRate < 5) {
		return "Cap rate is weak under current assumptions";
	}

	return "No major blocker identified under current assumptions";
}