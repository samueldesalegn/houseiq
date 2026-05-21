import { round } from "../utils/numberUtils.js";

export function calculateInvestmentAnalysis(property, assumptions = {}) {
	const purchasePrice =
		assumptions.purchase_price ||
		property.list_price ||
		property.estimated_value ||
		0;

	const rentAdjustmentPercent =
		assumptions.rent_adjustment_percent ?? 0;

	const estimatedRent =
		(property.estimated_rent || 0) *
		(1 + rentAdjustmentPercent / 100);

	const downPaymentPercent =
		assumptions.down_payment_percent ?? 20;

	const interestRate = assumptions.interest_rate ?? 7;
	const loanTermYears = assumptions.loan_term_years ?? 30;

	const annualPropertyTax =
		assumptions.annual_property_tax ?? purchasePrice * 0.018;

	const annualInsurance =
		assumptions.annual_insurance ?? purchasePrice * 0.006;

	const maintenancePercent =
		assumptions.maintenance_percent ?? 0.05;

	const vacancyPercent =
		assumptions.vacancy_percent ?? 0.05;

	const propertyManagementPercent =
		assumptions.property_management_percent ?? 0.08;

	const closingCostPercent =
		assumptions.closing_cost_percent ?? 0.03;

	const downPayment =
		purchasePrice * (downPaymentPercent / 100);

	const loanAmount = purchasePrice - downPayment;

	const monthlyMortgage = calculateMonthlyMortgage({
		loanAmount,
		annualInterestRate: interestRate,
		loanTermYears,
	});

	const monthlyPropertyTax = annualPropertyTax / 12;
	const monthlyInsurance = annualInsurance / 12;
	const monthlyMaintenance = estimatedRent * maintenancePercent;
	const monthlyVacancy = estimatedRent * vacancyPercent;
	const monthlyPropertyManagement =
		estimatedRent * propertyManagementPercent;

	const monthlyOperatingExpenses =
		monthlyPropertyTax +
		monthlyInsurance +
		monthlyMaintenance +
		monthlyVacancy +
		monthlyPropertyManagement;

	const monthlyExpenses =
		monthlyMortgage + monthlyOperatingExpenses;

	const monthlyCashFlow = estimatedRent - monthlyExpenses;
	const annualCashFlow = monthlyCashFlow * 12;

	const annualGrossRent = estimatedRent * 12;
	const annualOperatingExpenses =
		monthlyOperatingExpenses * 12;

	const netOperatingIncome =
		annualGrossRent - annualOperatingExpenses;

	const capRate =
		purchasePrice > 0
			? (netOperatingIncome / purchasePrice) * 100
			: 0;

	const totalCashInvested =
		downPayment + purchasePrice * closingCostPercent;

	const cashOnCashReturn =
		totalCashInvested > 0
			? (annualCashFlow / totalCashInvested) * 100
			: 0;

	const annualDebtService = monthlyMortgage * 12;

	const dscr =
		annualDebtService > 0
			? netOperatingIncome / annualDebtService
			: 0;

	return {
		assumptions: {
			purchase_price: round(purchasePrice),
			down_payment_percent: downPaymentPercent,
			interest_rate: interestRate,
			loan_term_years: loanTermYears,
			annual_property_tax: round(annualPropertyTax),
			annual_insurance: round(annualInsurance),
			maintenance_percent: maintenancePercent,
			vacancy_percent: vacancyPercent,
			property_management_percent:
				propertyManagementPercent,
			closing_cost_percent: closingCostPercent,
			rent_adjustment_percent: rentAdjustmentPercent,
		},

		financing: {
			down_payment: round(downPayment),
			loan_amount: round(loanAmount),
			monthly_mortgage: round(monthlyMortgage),
			total_cash_invested: round(totalCashInvested),
		},

		monthly_numbers: {
			estimated_rent: round(estimatedRent),
			mortgage: round(monthlyMortgage),
			property_tax: round(monthlyPropertyTax),
			insurance: round(monthlyInsurance),
			maintenance: round(monthlyMaintenance),
			vacancy: round(monthlyVacancy),
			property_management: round(
				monthlyPropertyManagement
			),
			total_expenses: round(monthlyExpenses),
			cash_flow: round(monthlyCashFlow),
		},

		return_metrics: {
			annual_gross_rent: round(annualGrossRent),
			net_operating_income: round(netOperatingIncome),
			annual_cash_flow: round(annualCashFlow),
			cap_rate: round(capRate),
			cash_on_cash_return: round(cashOnCashReturn),
			dscr: round(dscr, 2),
		},

		decision: getInvestmentDecision({
			monthlyCashFlow,
			capRate,
			cashOnCashReturn,
			dscr,
		}),
	};
}

function calculateMonthlyMortgage({
	loanAmount,
	annualInterestRate,
	loanTermYears,
}) {
	if (!loanAmount || loanAmount <= 0) return 0;

	const monthlyRate = annualInterestRate / 100 / 12;
	const numberOfPayments = loanTermYears * 12;

	if (monthlyRate === 0) {
		return loanAmount / numberOfPayments;
	}

	return (
		loanAmount *
		(monthlyRate *
			Math.pow(1 + monthlyRate, numberOfPayments)) /
		(Math.pow(1 + monthlyRate, numberOfPayments) - 1)
	);
}

function getInvestmentDecision({
	monthlyCashFlow,
	capRate,
	cashOnCashReturn,
	dscr,
}) {
	if (
		monthlyCashFlow > 200 &&
		capRate >= 7 &&
		cashOnCashReturn >= 8 &&
		dscr >= 1.2
	) {
		return "Strong buy candidate";
	}

	if (
		monthlyCashFlow >= 0 &&
		capRate >= 5.5 &&
		dscr >= 1
	) {
		return "Possible buy candidate";
	}

	if (monthlyCashFlow < 0 || dscr < 1) {
		return "Likely not a buy under current assumptions";
	}

	return "Needs deeper financial review";
}

export function calculateInvestmentScenarios(
	property,
	assumptions = {}
) {
	return {
		base_case: calculateInvestmentAnalysis(property, {
			...assumptions,
		}),

		optimistic_case: calculateInvestmentAnalysis(property, {
			...assumptions,
			down_payment_percent: 30,
			interest_rate: 5.75,
			vacancy_percent: 0.03,
			maintenance_percent: 0.04,
			property_management_percent: 0,
		}),

		conservative_case: calculateInvestmentAnalysis(property, {
			...assumptions,
			down_payment_percent: 15,
			interest_rate: 8.5,
			vacancy_percent: 0.08,
			maintenance_percent: 0.08,
			property_management_percent: 0.1,
		}),
	};
}