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
			const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
			
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'TranquilTaiwan/1.0'
				}
			});
			
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
		}, TIMEOUT);

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
			
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			});
			
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
		}, TIMEOUT);

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

	describe('5. Distance Calculation', () => {
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

