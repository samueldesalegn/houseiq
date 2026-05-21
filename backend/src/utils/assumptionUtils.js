export const ASSUMPTION_PROFILES = {
	default: {},

	conservative: {
		down_payment_percent: 25,
		interest_rate: 7,
		vacancy_percent: 0.08,
		maintenance_percent: 0.08,
		property_management_percent: 0.1,
	},

	cash_flow_investor: {
		down_payment_percent: 25,
		interest_rate: 6.75,
		vacancy_percent: 0.05,
		maintenance_percent: 0.06,
		property_management_percent: 0.08,
	},

	house_hacker: {
		down_payment_percent: 5,
		interest_rate: 6.5,
		vacancy_percent: 0.03,
		maintenance_percent: 0.04,
		property_management_percent: 0,
	},

	aggressive: {
		down_payment_percent: 15,
		interest_rate: 6.5,
		vacancy_percent: 0.03,
		maintenance_percent: 0.04,
		property_management_percent: 0,
	},
};

const NUMERIC_FIELDS = [
	"purchase_price",
	"down_payment_percent",
	"interest_rate",
	"loan_term_years",
	"annual_property_tax",
	"annual_insurance",
	"maintenance_percent",
	"vacancy_percent",
	"property_management_percent",
	"closing_cost_percent",
	"rent_adjustment_percent",
];

export function applyAssumptionProfile(
	profileName,
	assumptions = {}
) {
	const profile =
		ASSUMPTION_PROFILES[
		profileName || "default"
		];

	if (!profile) {
		throw new Error(
			`Invalid profile: ${Object.keys(
				ASSUMPTION_PROFILES
			).join(", ")}`
		);
	}

	return {
		...profile,
		...assumptions,
	};
}

export function normalizeAssumptions(
	assumptions = {}
) {
	const normalized = {};

	for (const [key, value] of Object.entries(
		assumptions
	)) {
		if (NUMERIC_FIELDS.includes(key)) {
			if (
				value === "" ||
				value === null ||
				value === undefined
			) {
				continue;
			}

			normalized[key] =
				typeof value === "string"
					? Number(value.trim())
					: value;
		} else {
			normalized[key] = value;
		}
	}

	return normalized;
}

export function validateAssumptions(
	assumptions = {}
) {
	const errors = [];

	validatePositiveNumber(
		errors,
		assumptions.purchase_price,
		"purchase_price"
	);

	validatePercent(
		errors,
		assumptions.down_payment_percent,
		"down_payment_percent",
		0,
		100
	);

	validatePercent(
		errors,
		assumptions.interest_rate,
		"interest_rate",
		0,
		25
	);

	validatePercent(
		errors,
		assumptions.maintenance_percent,
		"maintenance_percent",
		0,
		1
	);

	validatePercent(
		errors,
		assumptions.vacancy_percent,
		"vacancy_percent",
		0,
		1
	);

	validatePercent(
		errors,
		assumptions.property_management_percent,
		"property_management_percent",
		0,
		1
	);

	return errors;
}

function validatePositiveNumber(
	errors,
	value,
	field
) {
	if (value === undefined) return;

	if (!Number.isFinite(value) || value <= 0) {
		errors.push(
			`${field} must be a positive number`
		);
	}
}

function validatePercent(
	errors,
	value,
	field,
	min,
	max
) {
	if (value === undefined) return;

	if (
		!Number.isFinite(value) ||
		value < min ||
		value > max
	) {
		errors.push(
			`${field} must be between ${min} and ${max}`
		);
	}
}