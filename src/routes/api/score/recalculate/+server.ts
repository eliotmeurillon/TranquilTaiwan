import { json, error, type HttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchNoiseData, fetchAirQualityData, fetchSafetyData, fetchConvenienceData, fetchZoningData } from '$lib/server/services/dataFetchers';
import { calculateAllScores } from '$lib/server/services/scoreCalculator';

/**
 * POST /api/score/recalculate
 * Recalculate score for given coordinates
 * Body: { latitude: number, longitude: number }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		let body;
		try {
			body = await request.json();
		} catch (e) {
			console.error('Failed to parse request body:', e);
			error(400, 'Invalid request body. Expected JSON with latitude and longitude.');
		}
		
		const { latitude, longitude } = body;
		
		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			error(400, 'Invalid coordinates. Both latitude and longitude must be numbers.');
		}

		// Validate coordinate ranges (Taiwan is roughly 21.9-25.3 N, 119.5-122.0 E)
		if (latitude < 21 || latitude > 26 || longitude < 119 || longitude > 123) {
			error(400, 'Coordinates are outside Taiwan. Please provide valid Taiwan coordinates.');
		}

		// Calculate new score with new coordinates
		// Wrap each fetch in a try-catch to identify which one fails
		let noiseData, airQualityData, safetyData, convenienceData, zoningData;
		
		try {
			[noiseData, airQualityData, safetyData, convenienceData, zoningData] = await Promise.all([
				fetchNoiseData({ latitude, longitude }),
				fetchAirQualityData({ latitude, longitude }),
				fetchSafetyData({ latitude, longitude }),
				fetchConvenienceData({ latitude, longitude }),
				fetchZoningData({ latitude, longitude })
			]);
		} catch (fetchError) {
			const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
			console.error('Error fetching data for score recalculation:', {
				error: errorMessage,
				stack: fetchError instanceof Error ? fetchError.stack : undefined,
				coordinates: { latitude, longitude }
			});
			error(500, `Failed to fetch data: ${errorMessage}`);
		}
		
		const scoreBreakdown = calculateAllScores(
			noiseData,
			airQualityData,
			safetyData,
			convenienceData,
			zoningData
		);
		
		return json({
			coordinates: { latitude, longitude },
			scores: {
				overall: scoreBreakdown.overall,
				noise: scoreBreakdown.noise,
				airQuality: scoreBreakdown.airQuality,
				safety: scoreBreakdown.safety,
				convenience: scoreBreakdown.convenience,
				zoningRisk: scoreBreakdown.zoningRisk
			},
			detailedData: scoreBreakdown.rawData
		});
	} catch (err) {
		// Re-throw SvelteKit errors (they have a status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		// Log detailed error information
		const errorMessage = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : undefined;
		
		console.error('Error recalculating score:', {
			message: errorMessage,
			stack: errorStack,
			error: err
		});
		
		error(500, `Failed to recalculate score: ${errorMessage}`);
	}
};


