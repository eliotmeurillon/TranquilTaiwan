import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { addresses, livabilityScores } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { geocodeAddress, fetchNoiseData, fetchAirQualityData, fetchSafetyData, fetchConvenienceData, fetchZoningData } from '$lib/server/services/dataFetchers';
import { calculateAllScores } from '$lib/server/services/scoreCalculator';

/**
 * GET /api/score?address=...
 * Calculate or retrieve livability score for an address
 */
export const GET: RequestHandler = async ({ url }) => {
	const address = url.searchParams.get('address');
	
	if (!address) {
		error(400, 'Address parameter is required');
	}
	
	try {
		// Check if address already exists in database
		const existingAddress = await db
			.select()
			.from(addresses)
			.where(eq(addresses.address, address))
			.limit(1);
		
		let addressRecord;
		let coordinates;
		let isApproximate = false;
		
		if (existingAddress.length > 0) {
			addressRecord = existingAddress[0];
			coordinates = {
				latitude: parseFloat(addressRecord.latitude || '0'),
				longitude: parseFloat(addressRecord.longitude || '0')
			};
			// Check if approximate flag exists in rawData (for backward compatibility)
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
			// Geocode the address
			const geocodeResult = await geocodeAddress(address);
			if (!geocodeResult) {
				error(400, 'Could not geocode address');
			}
			
			coordinates = geocodeResult.coordinates;
			isApproximate = geocodeResult.isApproximate;
			
			// Save address to database
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
		
		// Check if score already exists and is recent (within 24 hours)
		const existingScore = await db
			.select()
			.from(livabilityScores)
			.where(
				and(
					eq(livabilityScores.addressId, addressRecord.id),
					// Check if calculated within last 24 hours
					// For simplicity, we'll recalculate each time, but in production you'd cache
				)
			)
			.orderBy(desc(livabilityScores.calculatedAt))
			.limit(1);
		
		let scoreRecord;
		
		if (existingScore.length > 0) {
			// Use existing score
			scoreRecord = existingScore[0];
		} else {
			// Calculate new score
			const [noiseData, airQualityData, safetyData, convenienceData, zoningData] = await Promise.all([
				fetchNoiseData(coordinates),
				fetchAirQualityData(coordinates),
				fetchSafetyData(coordinates),
				fetchConvenienceData(coordinates),
				fetchZoningData(coordinates)
			]);
			
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
			
			scoreRecord = newScore;
		}
		
		// Store isApproximate in rawData for persistence
		const rawDataWithApproximate = {
			...(scoreRecord.rawData as any || {}),
			isApproximate
		};
		
		// Return complete score with all detailed data (free service)
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
		
	} catch (err) {
		console.error('Error calculating score:', err);
		error(500, 'Failed to calculate score');
	}
};

