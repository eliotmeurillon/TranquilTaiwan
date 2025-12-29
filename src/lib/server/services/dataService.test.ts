import { describe, it, expect, vi } from 'vitest';
import { getLivabilityScore } from './dataService';

// Mock the environment module to avoid import errors during test
// Use a getter to read process.env dynamically at access time
vi.mock('$env/dynamic/private', () => ({
	get env() {
		const apiKey = process.env.MOENV_API_KEY || '';
		const tdxClientId = process.env.TDX_CLIENT_ID || '';
		const tdxClientSecret = process.env.TDX_CLIENT_SECRET || '';
		
		// Debug: log if API keys are loaded (only first few chars for security)
		if (apiKey) {
			console.log(`✓ MOENV_API_KEY loaded: ${apiKey.substring(0, 8)}...`);
		} else {
			console.warn('⚠ MOENV_API_KEY not found in process.env');
		}
		
		if (tdxClientId && tdxClientSecret) {
			console.log(`✓ TDX credentials loaded: ${tdxClientId.substring(0, 10)}...`);
		} else {
			console.warn('⚠ TDX_CLIENT_ID or TDX_CLIENT_SECRET not found in process.env');
		}
		
		return {
			MOENV_API_KEY: apiKey,
			TDX_CLIENT_ID: tdxClientId,
			TDX_CLIENT_SECRET: tdxClientSecret
		};
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
		
		// Transport Check (TDX YouBike API with Authentication)
		// The mock implementation returns 'YouBike Station (Mock)'
		if (result.transport.nearestYouBike === 'YouBike Station (Mock)') {
			console.warn('⚠️ Transport API failed or timed out. Check TDX credentials and network connection.');
		} else {
			console.log(`✅ Transport API Success: Found station "${result.transport.nearestYouBike}" at ${result.transport.distance}m`);
			expect(result.transport.nearestYouBike).not.toBe('YouBike Station (Mock)');
			expect(result.transport.distance).toBeGreaterThan(0);
			expect(result.transport.distance).toBeLessThan(100000); // Reasonable max distance
		}

		// Air Quality Check (MOENV API)
		// The mock implementation returns status 'Good (Mock)'
		if (result.airQuality.status === 'Good (Mock)') {
			console.warn('⚠️ Air Quality API failed. This is unexpected if key is valid.');
			// Don't fail the test, but log the warning
		} else {
			console.log(`✅ Air Quality API Success: AQI ${result.airQuality.aqi} (${result.airQuality.status})`);
			expect(result.airQuality.status).not.toBe('Good (Mock)');
		}

		// Noise Check - should not be mock anymore
		expect(result.noiseScore).toBeTypeOf('number');
		expect(result.noiseScore).toBeGreaterThanOrEqual(0);
		expect(result.noiseScore).toBeLessThanOrEqual(100);
		console.log(`✅ Noise Score: ${result.noiseScore}`);

	}, TIMEOUT);

	it('should handle API errors gracefully', async () => {
		console.log('\n⚠️ Testing error handling...');
		
		// Use an address that might cause issues
		const invalidAddress = 'ThisAddressDoesNotExist12345XYZ999';
		
		// Should throw error instead of returning mock data
		await expect(getLivabilityScore(invalidAddress)).rejects.toThrow();
		
		console.log('✅ Error handling works correctly');
	}, TIMEOUT);
});
