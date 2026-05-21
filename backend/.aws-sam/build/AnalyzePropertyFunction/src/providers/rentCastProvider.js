async function rentCastGet(path, queryParams = {}) {
	const apiKey = process.env.RENTCAST_API_KEY;

	if (!apiKey) {
		throw new Error("RENTCAST_API_KEY is missing");
	}

	const url = new URL(`https://api.rentcast.io/v1${path}`);

	Object.entries(queryParams).forEach(([key, value]) => {
		if (
			value !== undefined &&
			value !== null &&
			value !== ""
		) {
			url.searchParams.append(
				key,
				String(value)
			);
		}
	});

	console.log(
		"RentCast request:",
		url.toString()
	);

	console.log(
		"API Key loaded:",
		!!apiKey
	);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				accept: "application/json",
				"X-Api-Key": apiKey,
			},
		});

		console.log(
			"RentCast status:",
			response.status
		);

		if (!response.ok) {
			const errorText =
				await response.text();

			console.error(
				"RentCast API error:",
				errorText
			);

			throw new Error(
				`RentCast API error: ${response.status} - ${errorText}`
			);
		}

		return response.json();
	} catch (error) {
		console.error(
			"RentCast fetch failed:",
			{
				message: error.message,
				url: url.toString(),
				hasApiKey: !!apiKey,
				cause: error.cause,
				stack: error.stack,
			}
		);

		throw new Error(
			`RentCast fetch failed: ${error.message}`
		);
	}
}

export async function getRentCastProperty(
	address
) {
	const data = await rentCastGet(
		"/properties",
		{
			address,
		}
	);

	if (!data || data.length === 0) {
		throw new Error(
			"Property not found"
		);
	}

	return data[0];
}

export async function getRentCastValueEstimate(
	address,
	property = {}
) {
	return rentCastGet(
		"/avm/value",
		{
			address,
			propertyType:
				property.propertyType,

			bedrooms:
				property.bedrooms,

			bathrooms:
				property.bathrooms,

			squareFootage:
				property.squareFootage,

			compCount: 5,
		}
	);
}

export async function getRentCastRentEstimate(
	address,
	property = {}
) {
	return rentCastGet(
		"/avm/rent/long-term",
		{
			address,
			propertyType:
				property.propertyType,

			bedrooms:
				property.bedrooms,

			bathrooms:
				property.bathrooms,

			squareFootage:
				property.squareFootage,

			compCount: 5,
		}
	);
}