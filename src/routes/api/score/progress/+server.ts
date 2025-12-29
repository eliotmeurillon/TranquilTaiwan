import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { addresses, livabilityScores } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { geocodeAddress, fetchNoiseData, fetchAirQualityData, fetchSafetyData, fetchConvenienceData, fetchZoningData } from '$lib/server/services/dataFetchers';
import { calculateAllScores } from '$lib/server/services/scoreCalculator';

/**
 * POST /api/score/progress
 * Calculate score with progress updates
 * Body: { address: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	const { address } = await request.json();
	
	if (!address) {
		error(400, 'Address parameter is required');
	}
	
	try {
		let coordinates;
		let isApproximate = false;
		let addressRecord;
		
		// Step 1: Geocoding
		const existingAddress = await db
			.select()
			.from(addresses)
			.where(eq(addresses.address, address))
			.limit(1);
		
		if (existingAddress.length > 0) {
			addressRecord = existingAddress[0];
			coordinates = {
				latitude: parseFloat(addressRecord.latitude || '0'),
				longitude: parseFloat(addressRecord.longitude || '0')
			};
			const existingScore = await db
				.select()
				.from(livabilityScores)
				.where(eq(livabilityScores.addressId, addressRecord.id))
				.orderBy(desc(livabilityScores.calculatedAt))
				.limit(1);
			if (existingScore.length > 0 && existingScore[0].rawData) {
				isApproximate = (existingScore[0].rawData as any)?.isApproximate || false;
			}
		} else {
			const geocodeResult = await geocodeAddress(address);
			if (!geocodeResult) {
				error(400, 'Could not geocode address');
			}
			coordinates = geocodeResult.coordinates;
			isApproximate = geocodeResult.isApproximate;
			const [newAddress] = await db
				.insert(addresses)
				.values({
					address,
					latitude: coordinates.latitude.toString(),
					longitude: coordinates.longitude.toString()
				})
				.returning();
			addressRecord = newAddress;
		}
		
		// Check if score exists
		const existingScore = await db
			.select()
			.from(livabilityScores)
			.where(eq(livabilityScores.addressId, addressRecord.id))
			.orderBy(desc(livabilityScores.calculatedAt))
			.limit(1);
		
		if (existingScore.length > 0) {
			const scoreRecord = existingScore[0];
			const rawDataWithApproximate = {
				...(scoreRecord.rawData as any || {}),
				isApproximate
			};
			return json({
				address: addressRecord.address,
				coordinates: {
					latitude: parseFloat(addressRecord.latitude || '0'),
					longitude: parseFloat(addressRecord.longitude || '0')
				},
				isApproximate,
				scores: {
					overall: parseFloat(scoreRecord.overallScore || '0'),
					noise: parseFloat(scoreRecord.noiseScore || '0'),
					airQuality: parseFloat(scoreRecord.airQualityScore || '0'),
					safety: parseFloat(scoreRecord.safetyScore || '0'),
					convenience: parseFloat(scoreRecord.convenienceScore || '0'),
					zoningRisk: parseFloat(scoreRecord.zoningRiskScore || '0')
				},
				detailedData: rawDataWithApproximate
			});
		}
		
		// Calculate new score sequentially with progress
		const noiseData = await fetchNoiseData(coordinates);
		const airQualityData = await fetchAirQualityData(coordinates);
		const safetyData = await fetchSafetyData(coordinates);
		const convenienceData = await fetchConvenienceData(coordinates);
		const zoningData = await fetchZoningData(coordinates);
		
		const scoreBreakdown = calculateAllScores(
			noiseData,
			airQualityData,
			safetyData,
			convenienceData,
			zoningData
		);
		
		// Save score to database
		const [newScore] = await db
			.insert(livabilityScores)
			.values({
				addressId: addressRecord.id,
				overallScore: scoreBreakdown.overall.toString(),
				noiseScore: scoreBreakdown.noise.toString(),
				airQualityScore: scoreBreakdown.airQuality.toString(),
				safetyScore: scoreBreakdown.safety.toString(),
				convenienceScore: scoreBreakdown.convenience.toString(),
				zoningRiskScore: scoreBreakdown.zoningRisk.toString(),
				rawData: scoreBreakdown.rawData as any
			})
			.returning();
		
		const rawDataWithApproximate = {
			...(newScore.rawData as any || {}),
			isApproximate
		};
		
		return json({
			address: addressRecord.address,
			coordinates: {
				latitude: parseFloat(addressRecord.latitude || '0'),
				longitude: parseFloat(addressRecord.longitude || '0')
			},
			isApproximate,
			scores: {
				overall: parseFloat(newScore.overallScore || '0'),
				noise: parseFloat(newScore.noiseScore || '0'),
				airQuality: parseFloat(newScore.airQualityScore || '0'),
				safety: parseFloat(newScore.safetyScore || '0'),
				convenience: parseFloat(newScore.convenienceScore || '0'),
				zoningRisk: parseFloat(newScore.zoningRiskScore || '0')
			},
			detailedData: rawDataWithApproximate
		});
		
	} catch (err) {
		console.error('Error calculating score:', err);
		const errorMessage = err instanceof Error ? err.message : 'Failed to calculate score';
		error(500, errorMessage);
	}
};

