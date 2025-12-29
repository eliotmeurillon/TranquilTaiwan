/**
 * Data Fetchers Service
 * Fetches data from Taiwan government APIs and other sources
 * 
 * Uses real implementations where available (geocoding, air quality)
 * Falls back to mock data for features not yet implemented
 */

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getTDXAccessToken } from '$lib/server/tdx-auth';
import type { AddressCoordinates } from './scoreCalculator';
import type {
	NoiseData,
	AirQualityData,
	SafetyData,
	ConvenienceData,
	ZoningData
} from './scoreCalculator';

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
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

/**
 * Fetch noise data from Taiwan noise monitoring stations
 * API: Environmental Protection Administration noise monitoring data
 */
export async function fetchNoiseData(coords: AddressCoordinates): Promise<NoiseData> {
	// TODO: Integrate with actual API
	// Example: https://data.gov.tw/dataset/...
	
	// Mock implementation - in production, fetch from:
	// - Noise monitoring stations API
	// - Traffic flow data API
	// - Religious sites POI data
	
	const mockNoiseLevel = 58 + Math.random() * 10; // 58-68 dB
	const nearbyTemples = Math.floor(Math.random() * 3); // 0-2 temples
	const majorRoads = Math.floor(Math.random() * 2); // 0-1 major roads
	const trafficIntensity = Math.random() * 50; // 0-50
	
	return {
		level: Math.round(mockNoiseLevel * 10) / 10,
		nearbyTemples,
		majorRoads,
		trafficIntensity: Math.round(trafficIntensity * 10) / 10
	};
}

/**
 * Fetch air quality data
 * API: Environmental Protection Administration AQI data (MOENV)
 */
export async function fetchAirQualityData(coords: AddressCoordinates): Promise<AirQualityData> {
	const API_KEY = env.MOENV_API_KEY || 'PLACEHOLDER_KEY';
	const url = `https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=${API_KEY}&limit=1000&sort=ImportDate desc&format=json`;

	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Air Quality API failed: ${response.statusText}`);
		}

		const data = await response.json();
		const records = data.records;

		if (!records || records.length === 0) {
			throw new Error('No air quality data available');
		}

		// Find nearest station
		let nearestStation = null;
		let minDistance = Infinity;

		for (const record of records) {
			if (!record.latitude || !record.longitude) continue;
			const dist = calculateDistance(
				coords.latitude, 
				coords.longitude, 
				parseFloat(record.latitude), 
				parseFloat(record.longitude)
			);
			if (dist < minDistance) {
				minDistance = dist;
				nearestStation = record;
			}
		}

		if (nearestStation) {
			// Extract PM2.5 and AQI from the station data
			// Note: The exact field names may vary based on the API response structure
			// Try various possible field names for PM2.5
			const pm25Value = nearestStation.pm25 || 
				nearestStation['PM2.5'] || 
				nearestStation.pm25Value || 
				nearestStation['PM2.5_AVG'] ||
				nearestStation['細懸浮微粒'] ||
				'0';
			const pm25 = parseFloat(String(pm25Value)) || 0;
			
			// AQI might be in different fields
			const aqiValue = nearestStation.aqi || 
				nearestStation.AQI || 
				nearestStation.aqiValue ||
				nearestStation['空氣品質指標'] ||
				'0';
			const aqi = parseInt(String(aqiValue), 10) || 0;
			
			// Dengue risk is still mock (not available in MOENV API)
			const dengueRisk = Math.random() > 0.7; // 30% chance
			const historicalCases = dengueRisk ? Math.floor(Math.random() * 20) : 0;
			
			return {
				pm25: Math.round(pm25 * 10) / 10,
				aqi: Math.round(aqi),
				dengueRisk,
				historicalDengueCases: historicalCases
			};
		}
		
		throw new Error('No nearby station found');

	} catch (e) {
		console.warn('Using mock air quality data due to API error:', e);
		// Mock data fallback
		const mockPM25 = 15 + Math.random() * 20; // 15-35 μg/m³
		const mockAQI = 50 + Math.random() * 80; // 50-130
		const dengueRisk = Math.random() > 0.7; // 30% chance
		const historicalCases = dengueRisk ? Math.floor(Math.random() * 20) : 0;
		
		return {
			pm25: Math.round(mockPM25 * 10) / 10,
			aqi: Math.round(mockAQI),
			dengueRisk,
			historicalDengueCases: historicalCases
		};
	}
}

/**
 * Fetch safety data
 * API: Traffic accident data, crime statistics
 */
export async function fetchSafetyData(coords: AddressCoordinates): Promise<SafetyData> {
	// TODO: Integrate with actual API
	// Example: https://data.gov.tw/dataset/...
	
	// Mock implementation - in production, fetch from:
	// - Traffic accident database
	// - Police crime statistics API
	// - Pedestrian safety data
	
	const accidentHotspots = Math.floor(Math.random() * 3); // 0-2 hotspots
	const crimeRate = Math.random() * 0.3; // 0-0.3 (normalized)
	const pedestrianSafety = 60 + Math.random() * 30; // 60-90
	
	return {
		accidentHotspots,
		crimeRate: Math.round(crimeRate * 100) / 100,
		pedestrianSafety: Math.round(pedestrianSafety)
	};
}

/**
 * Fetch convenience data
 * API: YouBike stations, public services
 */
export async function fetchConvenienceData(coords: AddressCoordinates): Promise<ConvenienceData> {
	// Real implementation for YouBike via TDX + mock for other convenience sources
	// TDX YouBike stations API (Taipei)
	const youbikeUrl =
		'https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?%24format=JSON';

	let youbikeStations = 0;
	let nearestDistance = Infinity;
	let nearestName: string | undefined;

	try {
		const token = await getTDXAccessToken();

		const response = await fetch(youbikeUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`YouBike API failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		if (Array.isArray(data) && data.length > 0) {
			for (const station of data) {
				if (
					!station.StationPosition ||
					!station.StationPosition.PositionLat ||
					!station.StationPosition.PositionLon
				)
					continue;

				const stationLat = station.StationPosition.PositionLat;
				const stationLon = station.StationPosition.PositionLon;

				const dist = calculateDistance(
					coords.latitude,
					coords.longitude,
					stationLat,
					stationLon
				);

				// Count stations within 1km radius
				if (dist <= 1000) {
					youbikeStations += 1;
				}

				if (dist < nearestDistance) {
					nearestDistance = dist;
					nearestName = station.StationName?.Zh_tw ?? station.StationName?.En ?? '';
				}
			}
		}
	} catch (e) {
		console.warn('Using mock YouBike data due to TDX API error:', e);
		// Fall back to mock values similar to previous implementation
		youbikeStations = Math.floor(Math.random() * 5); // 0-4 stations
		nearestDistance =
			youbikeStations > 0
				? 100 + Math.random() * 800 // 100-900m
				: 1000 + Math.random() * 2000; // 1000-3000m if no stations
		nearestName = undefined;
	}

	// Other convenience metrics remain mock for now
	const trashCollectionPoints = Math.floor(Math.random() * 3); // 0-2 points
	const waterPoints = Math.floor(Math.random() * 5); // 0-4 points
	const publicTransportScore = 50 + Math.random() * 40; // 50-90

	return {
		youbikeStations,
		nearestYoubikeDistance: nearestDistance === Infinity ? 3000 : Math.round(nearestDistance),
		nearestYoubikeName: nearestName,
		trashCollectionPoints,
		waterPoints,
		publicTransportScore: Math.round(publicTransportScore)
	};
}

/**
 * Fetch zoning data
 * API: Urban planning and zoning data
 */
export async function fetchZoningData(coords: AddressCoordinates): Promise<ZoningData> {
	// TODO: Integrate with actual API
	// Example: https://data.gov.tw/dataset/...
	
	// Mock implementation - in production, fetch from:
	// - Urban planning database
	// - Zoning map API
	// - Future development plans
	
	const adjacentIndustrial = Math.random() > 0.8; // 20% chance
	const adjacentHighIntensityCommercial = Math.random() > 0.7; // 30% chance
	const futureDevelopmentRisk = Math.random() * 5; // 0-5
	
	return {
		adjacentIndustrial,
		adjacentHighIntensityCommercial,
		futureDevelopmentRisk: Math.round(futureDevelopmentRisk * 10) / 10
	};
}

/**
 * Helper: call Nominatim and return first result or null with approximation flag
 */
async function queryNominatim(query: string, originalAddress: string): Promise<{ coordinates: AddressCoordinates; isApproximate: boolean } | null> {
	const response = await fetch(
		`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&countrycodes=tw&limit=5`,
		{
			headers: {
				'User-Agent': 'TranquilTaiwan/1.0'
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Geocoding failed: ${response.statusText}`);
	}

	const data = await response.json();
	if (!data || data.length === 0) {
		return null;
	}

	// Prefer results that match Taiwan/Taipei
	const taiwanResults = data.filter((r: any) => 
		r.address?.country === 'Taiwan' || 
		r.address?.country_code === 'tw' ||
		r.display_name?.includes('Taiwan') ||
		r.display_name?.includes('台灣')
	);
	
	const result = taiwanResults.length > 0 ? taiwanResults[0] : data[0];
	const coordinates = {
		latitude: parseFloat(result.lat),
		longitude: parseFloat(result.lon)
	};

	// Detect if this is an approximate location (center of street vs exact address)
	// Check if the result has a house number when the original query had one
	const originalHasHouseNumber = /\d+[號号]/.test(originalAddress) || /\d+號/.test(originalAddress);
	const resultHasHouseNumber = result.address?.house_number || result.address?.house;
	
	// Check if result type is "way" (street) vs "node" (specific point)
	const isStreetLevel = result.type === 'way' || result.addresstype === 'road';
	
	// If original had house number but result doesn't, it's approximate
	const isApproximate = originalHasHouseNumber && (!resultHasHouseNumber || isStreetLevel);

	return {
		coordinates,
		isApproximate
	};
}

/**
 * Geocode an address to coordinates
 * Uses OpenStreetMap Nominatim for geocoding with Taiwan address normalization
 * Returns coordinates and a flag indicating if the location is approximate
 * 
 * Strategy:
 * 1. Normalize Taiwan address format
 * 2. Try multiple query candidates (full address -> street level -> district level)
 * 3. Accept approximate results (street/district level) if exact address not found
 * 4. This is acceptable for our use case (analyzing noise/air quality in a radius)
 */
export async function geocodeAddress(address: string): Promise<{ coordinates: AddressCoordinates; isApproximate: boolean } | null> {
	const raw = address.trim();

	// Import normalization functions
	const { normalizeTaiwanAddress, generateGeocodingCandidates } = await import('./addressNormalizer');
	
	// Normalize the address first
	const normalized = normalizeTaiwanAddress(raw);
	
	// Generate geocoding candidates (from most specific to least specific)
	const candidates = generateGeocodingCandidates(normalized);
	
	// Also try original address variants (for non-Taiwan addresses or mixed formats)
	const originalCandidates: string[] = [raw];
	if (!/taiwan/i.test(raw) && !raw.includes('台灣')) {
		originalCandidates.push(`${raw}, Taiwan`);
	}
	
	// Combine normalized and original candidates
	const allCandidates = [...candidates, ...originalCandidates];
	
	// Try each candidate in order, accepting approximate results
	let bestResult: { coordinates: AddressCoordinates; isApproximate: boolean } | null = null;
	
	for (const query of allCandidates) {
		try {
			const result = await queryNominatim(query, normalized);
			if (result) {
				// Prefer exact matches, but accept approximate if that's all we have
				if (!result.isApproximate) {
					console.log(`✅ Exact geocoding match for: ${address} -> ${query}`);
					return result; // Exact match found, return immediately
				}
				// Store approximate result but keep trying for exact
				if (!bestResult) {
					bestResult = result;
					console.log(`📍 Approximate geocoding match for: ${address} -> ${query}`);
				}
			}
		} catch (e) {
			console.error('Geocoding error for query:', query, e);
		}
	}

	// Return best approximate result if found (street/district level is acceptable)
	if (bestResult) {
		console.log(`⚠️ Using approximate location (street/district level) for: ${address}`);
		return bestResult;
	}

	// Final fallback: deterministic mock coordinates near central Taipei (marked as approximate)
	console.warn('❌ Using mock coordinates due to geocoding error for address:', address);
	return {
		coordinates: {
			latitude: 25.033,
			longitude: 121.5654
		},
		isApproximate: true
	};
}

