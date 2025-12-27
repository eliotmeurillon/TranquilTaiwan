/**
 * Data Fetchers Service
 * Fetches data from Taiwan government APIs and other sources
 * 
 * Uses real implementations where available (geocoding, air quality)
 * Falls back to mock data for features not yet implemented
 */

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
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
	// TODO: Integrate with actual API
	// Example: https://data.gov.tw/dataset/...
	
	// Mock implementation - in production, fetch from:
	// - YouBike station API
	// - Trash collection route data
	// - Public water point data
	// - Public transport API
	
	// Simulate YouBike stations within 1km
	const youbikeStations = Math.floor(Math.random() * 5); // 0-4 stations
	const nearestDistance = youbikeStations > 0 
		? 100 + Math.random() * 800 // 100-900m
		: 1000 + Math.random() * 2000; // 1000-3000m if no stations
	
	const trashCollectionPoints = Math.floor(Math.random() * 3); // 0-2 points
	const waterPoints = Math.floor(Math.random() * 5); // 0-4 points
	const publicTransportScore = 50 + Math.random() * 40; // 50-90
	
	return {
		youbikeStations,
		nearestYoubikeDistance: Math.round(nearestDistance),
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
 * Geocode an address to coordinates
 * Uses OpenStreetMap Nominatim for geocoding
 */
export async function geocodeAddress(address: string): Promise<AddressCoordinates | null> {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
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
			throw new Error('Address not found');
		}

		return {
			latitude: parseFloat(data[0].lat),
			longitude: parseFloat(data[0].lon)
		};
	} catch (e) {
		console.error('Geocoding error:', e);
		// Fallback to mock coordinates (Taipei area)
		console.warn('Using mock coordinates due to geocoding error');
		return {
			latitude: 25.0330 + (Math.random() - 0.5) * 0.1, // Taipei area
			longitude: 121.5654 + (Math.random() - 0.5) * 0.1
		};
	}
}

