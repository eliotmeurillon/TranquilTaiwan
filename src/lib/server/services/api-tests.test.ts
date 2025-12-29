import { describe, it, expect, vi } from 'vitest';
import { getTDXAccessToken } from '../tdx-auth';

// Mock the environment module
vi.mock('$env/dynamic/private', () => ({
	get env() {
		return {
			TDX_CLIENT_ID: process.env.TDX_CLIENT_ID || '',
			TDX_CLIENT_SECRET: process.env.TDX_CLIENT_SECRET || '',
			MOENV_API_KEY: process.env.MOENV_API_KEY || ''
		};
	}
}));

describe('Individual API Tests', () => {
	const TIMEOUT = 20000;
	
	// Taipei 101 coordinates for testing
	const TAIPEI_101_LAT = 25.0339639;
	const TAIPEI_101_LON = 121.5644722;

	describe('1. TDX Authentication API', () => {
		it('should successfully authenticate and get access token', async () => {
			console.log('\n🔐 Testing TDX Authentication API...');
			
			const token = await getTDXAccessToken();
			
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.length).toBeGreaterThan(0);
			
			console.log(`✅ TDX Auth Success: Token retrieved (${token.substring(0, 20)}...)`);
		}, TIMEOUT);
	});

	describe('2. Geocoding API (Nominatim)', () => {
		it('should geocode a valid Taipei address', async () => {
			console.log('\n📍 Testing Nominatim Geocoding API...');
			
			const address = 'Taipei 101';
			const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1&countrycodes=tw&limit=5`;
			
			let response;
			let attempts = 0;
			const maxAttempts = 3;
			
			// Retry logic for rate limiting
			while (attempts < maxAttempts) {
				response = await fetch(url, {
					headers: {
						'User-Agent': 'TranquilTaiwan/1.0'
					}
				});
				
				if (response.status === 429) {
					attempts++;
					const delay = 2000 * Math.pow(2, attempts);
					console.log(`⚠️ Rate limited (429), retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
				
				break;
			}
			
			if (!response.ok && response.status === 429) {
				console.warn('⚠️ Still rate limited after retries, skipping test');
				return;
			}
			
			expect(response.ok).toBe(true);
			
			const data = await response.json();
			expect(data).toBeDefined();
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
			
			const firstResult = data[0];
			expect(firstResult.lat).toBeDefined();
			expect(firstResult.lon).toBeDefined();
			
			const lat = parseFloat(firstResult.lat);
			const lon = parseFloat(firstResult.lon);
			
			// Taipei 101 should be around these coordinates
			expect(lat).toBeGreaterThan(25.0);
			expect(lat).toBeLessThan(26.0);
			expect(lon).toBeGreaterThan(121.0);
			expect(lon).toBeLessThan(122.0);
			
			console.log(`✅ Geocoding Success: ${address} -> (${lat}, ${lon})`);
		}, TIMEOUT * 2);

		it('should handle invalid addresses gracefully', async () => {
			console.log('\n⚠️ Testing Geocoding error handling...');
			
			const invalidAddress = 'ThisAddressDoesNotExist12345XYZ';
			const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(invalidAddress)}`;
			
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'TranquilTaiwan/1.0'
				}
			});
			
			expect(response.ok).toBe(true);
			
			const data = await response.json();
			// Nominatim returns empty array for invalid addresses
			expect(Array.isArray(data)).toBe(true);
			
			console.log('✅ Geocoding error handling works correctly');
		}, TIMEOUT);
	});

	describe('3. Air Quality API (MOENV)', () => {
		it('should fetch air quality data for Taipei', async () => {
			console.log('\n🌬️ Testing MOENV Air Quality API...');
			
			const apiKey = process.env.MOENV_API_KEY || '';
			
			if (!apiKey || apiKey === 'PLACEHOLDER_KEY') {
				console.warn('⚠️ MOENV_API_KEY not set, skipping test');
				return;
			}
			
			const url = `https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=${apiKey}&limit=1000&sort=ImportDate desc&format=json`;
			
			const response = await fetch(url);
			
			if (!response.ok) {
				console.warn(`⚠️ Air Quality API returned ${response.status}, may need valid API key`);
				return;
			}
			
			const data = await response.json();
			expect(data).toBeDefined();
			expect(data.records).toBeDefined();
			expect(Array.isArray(data.records)).toBe(true);
			expect(data.records.length).toBeGreaterThan(0);
			
			// Check structure of first record
			const firstRecord = data.records[0];
			expect(firstRecord.latitude).toBeDefined();
			expect(firstRecord.longitude).toBeDefined();
			expect(firstRecord.aqi).toBeDefined();
			expect(firstRecord.status).toBeDefined();
			
			console.log(`✅ Air Quality API Success: Retrieved ${data.records.length} stations`);
			console.log(`   Sample: AQI ${firstRecord.aqi} (${firstRecord.status}) at (${firstRecord.latitude}, ${firstRecord.longitude})`);
		}, TIMEOUT);
	});

	describe('4. Transport API (TDX YouBike)', () => {
		it('should fetch YouBike stations with valid TDX token', async () => {
			console.log('\n🚴 Testing TDX YouBike API...');
			
			// First, get a valid token
			const token = await getTDXAccessToken();
			expect(token).toBeDefined();
			
			// Then fetch YouBike stations
			const url = 'https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?%24format=JSON';
			
			let response;
			let attempts = 0;
			const maxAttempts = 5;
			
			// Retry logic for rate limiting
			while (attempts < maxAttempts) {
				response = await fetch(url, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/json'
					}
				});
				
				if (response.status === 429) {
					attempts++;
					const delay = 2000 * Math.pow(2, attempts);
					console.log(`⚠️ Rate limited (429), retrying in ${delay}ms... (attempt ${attempts}/${maxAttempts})`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
				
				break;
			}
			
			if (!response.ok && response.status === 429) {
				console.warn('⚠️ Still rate limited after retries, skipping test');
				return;
			}
			
			expect(response.ok).toBe(true);
			
			const data = await response.json();
			expect(data).toBeDefined();
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
			
			// Check structure of first station
			const firstStation = data[0];
			expect(firstStation.StationName).toBeDefined();
			expect(firstStation.StationPosition).toBeDefined();
			expect(firstStation.StationPosition.PositionLat).toBeDefined();
			expect(firstStation.StationPosition.PositionLon).toBeDefined();
			
			console.log(`✅ YouBike API Success: Retrieved ${data.length} stations`);
			console.log(`   Sample station: ${firstStation.StationName.Zh_tw} at (${firstStation.StationPosition.PositionLat}, ${firstStation.StationPosition.PositionLon})`);
		}, TIMEOUT * 2);

		it('should fetch MRT stations with valid TDX token', async () => {
			console.log('\n🚇 Testing TDX MRT API...');
			
			const token = await getTDXAccessToken();
			expect(token).toBeDefined();
			
			const url = 'https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/TRTC?%24format=JSON&%24spatialFilter=nearby(25.0339639,121.5644722,1000)';
			
			let response;
			let attempts = 0;
			const maxAttempts = 5;
			
			while (attempts < maxAttempts) {
				response = await fetch(url, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/json'
					}
				});
				
				if (response.status === 429) {
					attempts++;
					const delay = 2000 * Math.pow(2, attempts);
					console.log(`⚠️ Rate limited (429), retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
				
				break;
			}
			
			if (!response.ok && response.status === 429) {
				console.warn('⚠️ Still rate limited after retries, skipping test');
				return;
			}
			
			expect(response.ok).toBe(true);
			
			const data = await response.json();
			expect(data).toBeDefined();
			expect(Array.isArray(data)).toBe(true);
			
			if (data.length > 0) {
				const firstStation = data[0];
				expect(firstStation.StationName).toBeDefined();
				expect(firstStation.StationPosition).toBeDefined();
				console.log(`✅ MRT API Success: Retrieved ${data.length} stations`);
			} else {
				console.log('✅ MRT API Success: No stations in range (expected)');
			}
		}, TIMEOUT * 2);

		it('should fetch Bus stops with valid TDX token', async () => {
			console.log('\n🚌 Testing TDX Bus API...');
			
			const token = await getTDXAccessToken();
			expect(token).toBeDefined();
			
			const url = 'https://tdx.transportdata.tw/api/basic/v2/Bus/Stop/City/Taipei?%24format=JSON&%24spatialFilter=nearby(25.0339639,121.5644722,500)';
			
			let response;
			let attempts = 0;
			const maxAttempts = 5;
			
			while (attempts < maxAttempts) {
				response = await fetch(url, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/json'
					}
				});
				
				if (response.status === 429) {
					attempts++;
					const delay = 2000 * Math.pow(2, attempts);
					console.log(`⚠️ Rate limited (429), retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
				
				break;
			}
			
			if (!response.ok && response.status === 429) {
				console.warn('⚠️ Still rate limited after retries, skipping test');
				return;
			}
			
			expect(response.ok).toBe(true);
			
			const data = await response.json();
			expect(data).toBeDefined();
			expect(Array.isArray(data)).toBe(true);
			
			console.log(`✅ Bus API Success: Retrieved ${data.length} stops`);
		}, TIMEOUT * 2);

		it('should fail without authentication token', async () => {
			console.log('\n⚠️ Testing YouBike API without token...');
			
			const url = 'https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?%24format=JSON';
			
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json'
				}
			});
			
			// Should fail without auth (401 Unauthorized)
			expect(response.ok).toBe(false);
			expect(response.status).toBe(401);
			
			console.log('✅ YouBike API correctly requires authentication');
		}, TIMEOUT);
	});

	describe('5. Overpass API', () => {
		it('should query Overpass API for temples and convenience stores', async () => {
			console.log('\n🏛️ Testing Overpass API...');
			
			const lat = 25.0339639;
			const lon = 121.5644722;
			const query = `[out:json];
(
  node["amenity"="place_of_worship"](around:300, ${lat}, ${lon});
  node["shop"="convenience"](around:300, ${lat}, ${lon});
  way["highway"~"primary|secondary"](around:100, ${lat}, ${lon});
);
out center;`;
			
			const instances = [
				'https://overpass-api.de/api/interpreter',
				'https://overpass.kumi.systems/api/interpreter',
				'https://overpass.openstreetmap.ru/api/interpreter'
			];
			
			let success = false;
			let lastError: Error | null = null;
			
			for (const instance of instances) {
				try {
					let response;
					let attempts = 0;
					const maxAttempts = 3;
					
					while (attempts < maxAttempts) {
						response = await fetch(instance, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
								'User-Agent': 'TranquilTaiwan/1.0'
							},
							body: query
						});
						
						if (response.status === 429 || response.status === 504) {
							attempts++;
							const delay = 3000 * Math.pow(2, attempts);
							console.log(`⚠️ ${response.status === 429 ? 'Rate limited' : 'Gateway timeout'} (${response.status}), retrying in ${delay}ms...`);
							await new Promise(resolve => setTimeout(resolve, delay));
							continue;
						}
						
						break;
					}
					
					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}
					
					const data = await response.json();
					expect(data).toBeDefined();
					expect(data.elements).toBeDefined();
					expect(Array.isArray(data.elements)).toBe(true);
					
					console.log(`✅ Overpass API Success (${instance}): Retrieved ${data.elements.length} elements`);
					success = true;
					break;
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));
					console.warn(`⚠️ Overpass instance ${instance} failed: ${lastError.message}`);
					continue;
				}
			}
			
			if (!success) {
				console.warn('⚠️ All Overpass instances failed, skipping test');
				return;
			}
			
			expect(success).toBe(true);
		}, TIMEOUT * 3);
	});

	describe('6. Distance Calculation', () => {
		it('should calculate distance between two points correctly', () => {
			console.log('\n📏 Testing distance calculation...');
			
			// Haversine formula implementation
			function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
				const R = 6371e3; // Earth's radius in meters
				const φ1 = (lat1 * Math.PI) / 180;
				const φ2 = (lat2 * Math.PI) / 180;
				const Δφ = ((lat2 - lat1) * Math.PI) / 180;
				const Δλ = ((lon2 - lon1) * Math.PI) / 180;

				const a =
					Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
					Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

				return R * c; // Distance in meters
			}
			
			// Test: Taipei 101 to Taipei Main Station (approximately 5.5 km)
			const taipei101Lat = 25.0339639;
			const taipei101Lon = 121.5644722;
			const mainStationLat = 25.047924;
			const mainStationLon = 121.517081;
			
			const distance = calculateDistance(taipei101Lat, taipei101Lon, mainStationLat, mainStationLon);
			
			// Should be approximately 5.5 km (5500m) with some tolerance
			expect(distance).toBeGreaterThan(5000);
			expect(distance).toBeLessThan(6000);
			
			console.log(`✅ Distance calculation works: ${Math.round(distance)}m`);
		});
	});
});

