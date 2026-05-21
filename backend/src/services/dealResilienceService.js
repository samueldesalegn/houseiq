import { calculateInvestmentAnalysis } from "./investmentAnalysisService.js";
import { round } from "../utils/numberUtils.js";

export function calculateDealResilience(property, assumptions = {}) {
	const baseCase = calculateInvestmentAnalysis(property, assumptions);

	const incomeStress5 = calculateInvestmentAnalysis(property, {
		...assumptions,
		rent_adjustment_percent:
			(assumptions.rent_adjustment_percent ?? 0) - 5,
	});

	const incomeStress10 = calculateInvestmentAnalysis(property, {
		...assumptions,
		rent_adjustment_percent:
			(assumptions.rent_adjustment_percent ?? 0) - 10,
	});

	const rateStress1 = calculateInvestmentAnalysis(property, {
		...assumptions,
		interest_rate:
			(baseCase.assumptions?.interest_rate ?? 0) + 1,
	});

	const maintenanceStress = calculateInvestmentAnalysis(property, {
		...assumptions,
		maintenance_percent:
			(baseCase.assumptions?.maintenance_percent ?? 0.05) * 2,
	});

	const resilienceScore = calculateResilienceScore({
		baseCase,
		incomeStress5,
		incomeStress10,
		rateStress1,
		maintenanceStress,
	});

	return {
		rating: getResilienceRating(resilienceScore),
		score: resilienceScore,
		stress_tests: {
			income_reduction_5_percent: formatStressTest(incomeStress5),
			income_reduction_10_percent: formatStressTest(incomeStress10),
			interest_rate_plus_1_percent: formatStressTest(rateStress1),
			maintenance_double: formatStressTest(maintenanceStress),
		},
		interpretation: generateResilienceInterpretation({
			baseCase,
			incomeStress10,
			rateStress1,
			maintenanceStress,
			resilienceScore,
		}),
	};
}

function formatStressTest(analysis) {
	return {
		cash_flow: round(analysis.monthly_numbers?.cash_flow ?? 0),
		decision: analysis.decision,
	};
}

function calculateResilienceScore({
	baseCase,
	incomeStress5,
	incomeStress10,
	rateStress1,
	maintenanceStress,
}) {
	let score = 50;

	const baseCashFlow = baseCase.monthly_numbers?.cash_flow ?? 0;
	const baseDscr = baseCase.return_metrics?.dscr ?? 0;

	score += scoreCashFlow(baseCashFlow);
	score += scoreDscr(baseDscr);
	score += scoreStressCashFlow(
		incomeStress5.monthly_numbers?.cash_flow ?? 0,
		-150,
		-8,
		-4
	);
	score += scoreStressCashFlow(
		incomeStress10.monthly_numbers?.cash_flow ?? 0,
		-250,
		-10,
		-5
	);
	score += scoreStressCashFlow(
		rateStress1.monthly_numbers?.cash_flow ?? 0,
		-250,
		-10,
		-5
	);
	score += scoreStressCashFlow(
		maintenanceStress.monthly_numbers?.cash_flow ?? 0,
		-250,
		-8,
		-4
	);

	return Math.max(0, Math.min(Math.round(score), 100));
}

function scoreCashFlow(cashFlow) {
	if (cashFlow >= 300) return 12;
	if (cashFlow >= 150) return 8;
	if (cashFlow >= 0) return 4;
	if (cashFlow >= -250) return -8;

	return -15;
}

function scoreDscr(dscr) {
	if (dscr >= 1.3) return 12;
	if (dscr >= 1.2) return 8;
	if (dscr >= 1.1) return 4;
	if (dscr >= 1) return 1;
	if (dscr >= 0.85) return -8;

	return -15;
}

function scoreStressCashFlow(
	cashFlow,
	negativeThreshold,
	severePenalty,
	moderatePenalty
) {
	if (cashFlow >= 0) return 6;
	if (cashFlow >= negativeThreshold) return moderatePenalty;

	return severePenalty;
}

function getResilienceRating(score) {
	if (score >= 85) return "resilient";
	if (score >= 60) return "moderate";
	if (score >= 35) return "fragile";

	return "highly fragile";
}

function generateResilienceInterpretation({
	baseCase,
	incomeStress10,
	rateStress1,
	maintenanceStress,
	resilienceScore,
}) {
	if (resilienceScore >= 85) {
		return "This deal appears resilient under moderate stress conditions.";
	}

	if (resilienceScore >= 60) {
		return "This deal has moderate resilience, but should still be reviewed carefully under changing financing or operating conditions.";
	}

	if (
		(baseCase.monthly_numbers?.cash_flow ?? 0) < 0 ||
		(baseCase.return_metrics?.dscr ?? 0) < 1
	) {
		return "This deal is fragile because the base underwriting is already weak or close to break-even.";
	}

	if (
		(incomeStress10.monthly_numbers?.cash_flow ?? 0) < 0 ||
		(rateStress1.monthly_numbers?.cash_flow ?? 0) < 0 ||
		(maintenanceStress.monthly_numbers?.cash_flow ?? 0) < 0
	) {
		return "This deal may work under current assumptions, but it is sensitive to moderate changes in rent, financing, or maintenance costs.";
	}

	return "This deal requires further review to understand its resilience.";
}