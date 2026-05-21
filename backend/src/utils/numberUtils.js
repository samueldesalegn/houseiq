export function formatCurrency(value) {
	const numericValue = Number(value) || 0;

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(numericValue);
}

export function round(value, decimals = 2) {
	if (!Number.isFinite(value)) return 0;
	return Number(value.toFixed(decimals));
}