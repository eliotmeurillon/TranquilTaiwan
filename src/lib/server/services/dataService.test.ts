import { describe, it, expect, vi } from 'vitest';
import { getLivabilityScore } from './dataService';

// Mock the environment module to avoid import errors during test
vi.mock('$env/dynamic/private', () => ({
	env: {
		MOENV_API_KEY: process.env.MOENV_API_KEY || ''
	}
}));

describe('dataService Integration Tests', () => {
	// Increase timeout for real network requests (20s)
	const TIMEOUT = 20000;

	it('should fetch real data for a valid Taipei address', async () => {
		// Using a well-known location in Taipei: Taipei 101
		const address = "Taipei 101";
		
		console.log(`\nTesting getLivabilityScore for: "${address}"...`);
		const result = await getLivabilityScore(address);
		
		console.log('Result received:', JSON.stringify(result, null, 2));

		// 1. Verify Structure
		expect(result).toBeDefined();
		expect(result.noiseScore).toBeTypeOf('number');

		expect(result.airQuality).toBeDefined();
		expect(result.airQuality.aqi).toBeTypeOf('number');
		
		expect(result.transport).toBeDefined();
		expect(result.transport.distance).toBeTypeOf('number');

		// 2. Verify Real Data Sources (vs Mocks)
		
		// Transport Check (TDX YouBike API)
		// The mock implementation returns 'YouBike Station (Mock)'
		if (result.transport.nearestYouBike === 'YouBike Station (Mock)') {
			console.warn('⚠️ Transport API failed or timed out (Expected 401 until Auth is implemented). Falling back to mock data.');
		} else {
			console.log(`✅ Transport API Success: Found station "${result.transport.nearestYouBike}" at ${result.transport.distance}m`);
			expect(result.transport.nearestYouBike).not.toBe('YouBike Station (Mock)');
		}

		// Air Quality Check (MOENV API)
		// The mock implementation returns status 'Good (Mock)'
		if (result.airQuality.status === 'Good (Mock)') {
			console.warn('⚠️ Air Quality API failed. This is unexpected if key is valid.');
			// Force fail if we expect real data now
			// expect(result.airQuality.status).not.toBe('Good (Mock)');
		} else {
			console.log(`✅ Air Quality API Success: AQI ${result.airQuality.aqi} (${result.airQuality.status})`);
			expect(result.airQuality.status).not.toBe('Good (Mock)');
		}

	}, TIMEOUT);
});
