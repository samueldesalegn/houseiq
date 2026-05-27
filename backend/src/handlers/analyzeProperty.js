import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";

import { normalizeAddress } from "../utils/normalizeAddress.js";
import { getPropertyAnalysis } from "../services/propertyDataService.js";

import {
    applyAssumptionProfile,
    normalizeAssumptions,
    validateAssumptions,
} from "../utils/assumptionUtils.js";

import { formatPropertyAnalysisResponse } from "../services/responseFormatterService.js";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

const ALLOWED_ORIGINS = new Set([
    "http://localhost:4200",

    // S3 website
    "http://houseiq-frontend-samuel.s3-website-us-east-1.amazonaws.com",

    // Current CloudFront distribution
    "https://d3drvfi3t99s.cloudfront.net",

    // SD Cloud Hub
    "https://sdcloudhub.com",
    "https://www.sdcloudhub.com",

    // Future HouseIQ custom domain
    "https://houseiq.sdcloudhub.com",
]);
function getAllowedOrigin(event) {
    const origin =
        event?.headers?.origin ||
        event?.headers?.Origin ||
        "";

    if (
        ALLOWED_ORIGINS.has(origin) ||
        origin.endsWith(".cloudfront.net")
    ) {
        return origin;
    }

    return "http://localhost:4200";
}

function jsonResponse(statusCode, data, event = {}) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": getAllowedOrigin(event),
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Allow-Credentials": "false",
        },
        body: JSON.stringify(data),
    };
}

export const handler = async (event) => {
    try {
        if (event.httpMethod === "OPTIONS") {
            return jsonResponse(200, {}, event);
        }

        const body = JSON.parse(event.body || "{}");

        if (!body.address) {
            return jsonResponse(
                400,
                {
                    message: "address is required",
                },
                event
            );
        }

        const profileName =
            body.assumption_profile ||
            body.profile ||
            "default";

        const assumptions = normalizeAssumptions(
            applyAssumptionProfile(
                profileName,
                body.assumptions || {}
            )
        );

        const assumptionErrors =
            validateAssumptions(assumptions);

        if (assumptionErrors.length > 0) {
            return jsonResponse(
                400,
                {
                    message: "Invalid assumptions",
                    errors: assumptionErrors,
                },
                event
            );
        }

        const includeDetails =
            body.include_details === true;

        const shouldRefresh =
            body.refresh === true;

        const hasCustomAssumptions =
            Object.keys(body.assumptions || {}).length > 0 ||
            profileName !== "default";

        const propertyId = normalizeAddress(body.address);
        const PK = `PROPERTY#${propertyId}`;
        const SK = "PROFILE";

        if (process.env.AWS_SAM_LOCAL === "true") {
            const property = await getPropertyAnalysis({
                PK,
                SK,
                propertyId,
                address: body.address,
                assumptions,
            });

            return jsonResponse(
                200,
                {
                    source: "sam_local_analysis",
                    ...formatPropertyAnalysisResponse(property, {
                        include_details: includeDetails,
                    }),
                },
                event
            );
        }

        if (!shouldRefresh && !hasCustomAssumptions) {
            const existing = await ddb.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: { PK, SK },
                })
            );

            if (existing.Item) {
                return jsonResponse(
                    200,
                    {
                        source: "cache",
                        ...formatPropertyAnalysisResponse(existing.Item, {
                            include_details: includeDetails,
                        }),
                    },
                    event
                );
            }
        }

        const property = await getPropertyAnalysis({
            PK,
            SK,
            propertyId,
            address: body.address,
            assumptions,
        });

        if (!hasCustomAssumptions) {
            await ddb.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: property,
                })
            );
        }

        return jsonResponse(
            200,
            {
                source: shouldRefresh
                    ? "refreshed_analysis"
                    : hasCustomAssumptions
                        ? "custom_assumption_analysis"
                        : "new_analysis",
                ...formatPropertyAnalysisResponse(property, {
                    include_details: includeDetails,
                }),
            },
            event
        );
    } catch (error) {
        console.error("Error:", error);

        if (error.message?.includes("Invalid assumption profile")) {
            return jsonResponse(
                400,
                {
                    message: "Invalid assumption profile",
                    error: error.message,
                },
                event
            );
        }

        if (
            error.message?.includes("resource/not-found") ||
            error.message?.includes("Property not found")
        ) {
            return jsonResponse(
                404,
                {
                    message: "Property not found",
                    details: error.message,
                },
                event
            );
        }

        if (
            error.message?.includes("billing/subscription-inactive")
        ) {
            return jsonResponse(
                402,
                {
                    message: "Property data subscription is inactive",
                    details: error.message,
                },
                event
            );
        }

        if (
            error.message?.includes("RentCast API error: 401") ||
            error.message?.includes("RentCast API error: 403")
        ) {
            return jsonResponse(
                401,
                {
                    message:
                        "Property data provider authentication failed",
                    details: error.message,
                },
                event
            );
        }

        if (error.message?.includes("RentCast API error")) {
            return jsonResponse(
                502,
                {
                    message: "Property data provider error",
                    details: error.message,
                },
                event
            );
        }

        return jsonResponse(
            500,
            {
                message: "Internal server error",
                error: error.message,
            },
            event
        );
    }
};
