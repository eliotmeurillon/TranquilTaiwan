import { json, error } from '@sveltejs/kit';
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
		const { latitude, longitude } = await request.json();
		
		if (typeof latitude !== 'number' || typeof longitude !== 'number') {
			error(400, 'Invalid coordinates');
		}

		// Calculate new score with new coordinates
		const [noiseData, airQualityData, safetyData, convenienceData, zoningData] = await Promise.all([
			fetchNoiseData({ latitude, longitude }),
			fetchAirQualityData({ latitude, longitude }),
			fetchSafetyData({ latitude, longitude }),
			fetchConvenienceData({ latitude, longitude }),
			fetchZoningData({ latitude, longitude })
		]);
		
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
		console.error('Error recalculating score:', err);
		error(500, 'Failed to recalculate score');
	}
};


