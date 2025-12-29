/**
 * Data Fetchers Service
 * Fetches data from Taiwan government APIs and other sources
 * 
 * Uses real implementations where available (geocoding, air quality)
 * Falls back to mock data for features not yet implemented
 * 
 * Includes rate limiting, caching, and retry logic to handle API limits
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
 * Simple in-memory cache for API responses
 * Key: cache key (e.g., "noise:25.033:121.565")
 * Value: { data: T, expiresAt: number }
 */
const apiCache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Rate limiting: track last request time per API endpoint
 */
const rateLimiters = new Map<string, number>();

/**
 * Cache TTLs (in milliseconds)
 */
const CACHE_TTL = {
	NOISE: 24 * 60 * 60 * 1000, // 24 hours (POI data doesn't change often)
	ZONING: 7 * 24 * 60 * 60 * 1000, // 7 days (zoning rarely changes)
	TDX: 60 * 60 * 1000, // 1 hour (transport data changes more frequently)
	AIR_QUALITY: 30 * 60 * 1000 // 30 minutes
};

/**
 * Rate limiting delays (minimum time between requests in ms)
 */
const RATE_LIMITS = {
	OVERPASS: 3000, // 3 seconds between Overpass requests (increased)
	TDX: 2000 // 2 seconds between TDX requests (increased from 500ms)
};

/**
 * Overpass API instances (fallback if one is rate limited)
 */
const OVERPASS_INSTANCES = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter',
	'https://overpass.openstreetmap.ru/api/interpreter'
];

/**
 * Get cache key for coordinates-based queries
 */
function getCacheKey(prefix: string, coords: AddressCoordinates, precision: number = 4): string {
	// Round coordinates to reduce cache misses for nearby locations
	const lat = Math.round(coords.latitude * Math.pow(10, precision)) / Math.pow(10, precision);
	const lon = Math.round(coords.longitude * Math.pow(10, precision)) / Math.pow(10, precision);
	return `${prefix}:${lat}:${lon}`;
}

/**
 * Get cached data if available and not expired
 */
function getCached<T>(key: string): T | null {
	const cached = apiCache.get(key);
	if (cached && Date.now() < cached.expiresAt) {
		return cached.data as T;
	}
	if (cached) {
		apiCache.delete(key); // Clean up expired entry
	}
	return null;
}

/**
 * Set cache data
 */
function setCached<T>(key: string, data: T, ttl: number): void {
	apiCache.set(key, {
		data,
		expiresAt: Date.now() + ttl
	});
	
	// Clean up cache if it gets too large (prevent memory leaks)
	// Keep cache size under 1000 entries
	if (apiCache.size > 1000) {
		const now = Date.now();
		for (const [k, v] of apiCache.entries()) {
			if (now >= v.expiresAt) {
				apiCache.delete(k);
			}
		}
		
		// If still too large, remove oldest 100 entries
		if (apiCache.size > 1000) {
			const entries = Array.from(apiCache.entries())
				.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
				.slice(0, 100);
			for (const [k] of entries) {
				apiCache.delete(k);
			}
		}
	}
}

/**
 * Rate limiting: check if we should wait before making a request
 */
async function rateLimit(apiName: string, delay: number): Promise<void> {
	const lastRequest = rateLimiters.get(apiName) || 0;
	const timeSinceLastRequest = Date.now() - lastRequest;
	
	if (timeSinceLastRequest < delay) {
		const waitTime = delay - timeSinceLastRequest;
		await new Promise(resolve => setTimeout(resolve, waitTime));
	}
	
	rateLimiters.set(apiName, Date.now());
}

/**
 * Retry fetch with exponential backoff
 * Handles 429 (Rate Limit), 504 (Gateway Timeout), and network errors
 */
async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries: number = 5,
	baseDelay: number = 2000
): Promise<Response> {
	let lastError: Error | null = null;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			// Add timeout to fetch (30 seconds)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);
			
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			// If rate limited (429) or gateway timeout (504), wait and retry
			if (response.status === 429 || response.status === 504) {
				if (attempt < maxRetries) {
					// Longer delays for rate limits: 2s, 4s, 8s, 16s, 32s
					const delay = baseDelay * Math.pow(2, attempt);
					console.warn(`${response.status === 429 ? 'Rate limited' : 'Gateway timeout'} (${response.status}) on attempt ${attempt + 1}, retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
				throw new Error(`${response.status === 429 ? 'Rate limited' : 'Gateway timeout'} after ${maxRetries + 1} attempts`);
			}
			
			if (!response.ok && response.status !== 429 && response.status !== 504) {
				// Non-retryable HTTP errors (400, 401, 403, 404, 500, etc.) should fail immediately
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			return response;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			
			// Check if this is a non-retryable HTTP error (has status code in message)
			// These should fail immediately without retries
			if (error instanceof Error && error.message.startsWith('HTTP ')) {
				const statusMatch = error.message.match(/HTTP (\d+):/);
				if (statusMatch) {
					const status = parseInt(statusMatch[1], 10);
					// Only retry on 429 and 504, fail immediately on others
					if (status !== 429 && status !== 504) {
						throw error; // Don't retry non-retryable HTTP errors
					}
				}
			}
			
			// If it's an abort (timeout), treat it like a 504
			if (error instanceof Error && error.name === 'AbortError') {
				if (attempt < maxRetries) {
					const delay = baseDelay * Math.pow(2, attempt);
					console.warn(`Request timeout on attempt ${attempt + 1}, retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}
				throw new Error('Request timeout after retries');
			}
			
			// For network errors and retryable HTTP errors, retry with backoff
			if (attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	throw lastError || new Error('Fetch failed after retries');
}

/**
 * Query Overpass API with retry and fallback instances
 */
async function queryOverpassAPI(query: string): Promise<any> {
	let lastError: Error | null = null;
	
	// Try each Overpass instance
	for (const instance of OVERPASS_INSTANCES) {
		try {
			await rateLimit('overpass', RATE_LIMITS.OVERPASS);
			
			const response = await fetchWithRetry(
				instance,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'User-Agent': 'TranquilTaiwan/1.0'
					},
					body: query
				},
				3, // Max 3 retries per instance (increased from 2)
				3000 // Base delay 3 seconds (increased from 2)
			);
			
			if (!response.ok) {
				throw new Error(`Overpass API failed: ${response.status} ${response.statusText}`);
			}
			
			return await response.json();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.warn(`Overpass instance ${instance} failed, trying next...`, error instanceof Error ? error.message : String(error));
			// Continue to next instance
		}
	}
	
	throw lastError || new Error('All Overpass API instances failed');
}

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
 * Fetch noise data using OpenStreetMap Overpass API
 * Calculates noise level based on nearby temples, convenience stores, and major roads
 */
export async function fetchNoiseData(coords: AddressCoordinates): Promise<NoiseData> {
	const { latitude, longitude } = coords;
	
	// Check cache first
	const cacheKey = getCacheKey('noise', coords);
	const cached = getCached<NoiseData>(cacheKey);
	if (cached) {
		console.log('✅ Using cached noise data');
		return cached;
	}
	
	// Overpass API query to get temples, convenience stores, and major roads within 300m
	const overpassQuery = `[out:json];
(
  node["amenity"="place_of_worship"](around:300, ${latitude}, ${longitude});
  node["shop"="convenience"](around:300, ${latitude}, ${longitude});
  way["highway"~"primary|secondary"](around:100, ${latitude}, ${longitude});
);
out center;`;

	try {
		const data = await queryOverpassAPI(overpassQuery);
		const elements = data.elements || [];

		// Count different types of noise sources
		let nearbyTemples = 0;
		let convenienceStores = 0;
		let majorRoads = 0;

		for (const element of elements) {
			if (element.type === 'node') {
				if (element.tags?.amenity === 'place_of_worship') {
					nearbyTemples++;
				} else if (element.tags?.shop === 'convenience') {
					convenienceStores++;
				}
			} else if (element.type === 'way') {
				// Major roads (primary or secondary highways)
				// Note: Ways are road segments, so multiple segments of the same road may be counted
				// This is acceptable for noise estimation as it reflects road density
				if (element.tags?.highway === 'primary' || element.tags?.highway === 'secondary') {
					majorRoads++;
				}
			} else if (element.type === 'relation') {
				// Relations might also represent roads, but less common
				if (element.tags?.highway === 'primary' || element.tags?.highway === 'secondary') {
					majorRoads++;
				}
			}
		}

		// Calculate estimated noise level based on sources
		// Base noise level: 50 dB (quiet residential)
		let estimatedNoiseLevel = 50;

		// Each temple adds ~3-5 dB (festival noise)
		estimatedNoiseLevel += nearbyTemples * 4;

		// Each convenience store adds ~2-3 dB (24/7 activity)
		estimatedNoiseLevel += convenienceStores * 2.5;

		// Major roads add significant noise: ~8-12 dB per road
		estimatedNoiseLevel += majorRoads * 10;

		// Cap at reasonable maximum (80 dB is very loud)
		estimatedNoiseLevel = Math.min(80, estimatedNoiseLevel);

		// Traffic intensity is proportional to major roads
		const trafficIntensity = majorRoads * 15 + convenienceStores * 5;

		const result: NoiseData = {
			level: Math.round(estimatedNoiseLevel * 10) / 10,
			nearbyTemples,
			majorRoads,
			trafficIntensity: Math.round(trafficIntensity * 10) / 10
		};

		// Cache the result
		setCached(cacheKey, result, CACHE_TTL.NOISE);
		return result;

	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		console.error('Failed to fetch noise data:', errorMessage);
		throw new Error(`Impossible de récupérer les données de bruit: ${errorMessage}`);
	}
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
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		console.error('Failed to fetch air quality data:', errorMessage);
		throw new Error(`Impossible de récupérer les données de qualité de l'air: ${errorMessage}`);
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
	// Check cache first
	const cacheKey = getCacheKey('convenience', coords);
	const cached = getCached<ConvenienceData>(cacheKey);
	if (cached) {
		console.log('✅ Using cached convenience data');
		return cached;
	}

	// Real implementation for YouBike via TDX + mock for other convenience sources
	// TDX YouBike stations API (Taipei)
	const youbikeUrl =
		'https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?%24format=JSON';

	let youbikeStations = 0;
	let nearestDistance = Infinity;
	let nearestName: string | undefined;

	try {
		await rateLimit('tdx', RATE_LIMITS.TDX);
		const token = await getTDXAccessToken();

		const response = await fetchWithRetry(
			youbikeUrl,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			},
			5, // Increased retries for TDX
			3000 // Increased base delay to 3 seconds
		);

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
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		console.error('Failed to fetch YouBike data:', errorMessage);
		throw new Error(`Impossible de récupérer les données YouBike: ${errorMessage}`);
	}

	// Fetch MRT stations and Bus stops using TDX API
	let mrtStations = 0;
	let nearestMrtDistance = Infinity;
	let nearestMrtName: string | undefined;
	let busStops = 0;
	let nearestBusDistance = Infinity;

		try {
			await rateLimit('tdx', RATE_LIMITS.TDX);
			const token = await getTDXAccessToken();

			// Fetch MRT stations within 1km
			const mrtUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/TRTC?%24format=JSON&%24spatialFilter=nearby(${coords.latitude},${coords.longitude},1000)`;
			
			const mrtResponse = await fetchWithRetry(
				mrtUrl,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/json'
					}
				},
				5, // Increased retries for TDX
				3000 // Increased base delay to 3 seconds
			);

		if (mrtResponse.ok) {
			const mrtData = await mrtResponse.json();
			
			if (Array.isArray(mrtData) && mrtData.length > 0) {
				for (const station of mrtData) {
					if (!station.StationPosition?.PositionLat || !station.StationPosition?.PositionLon) {
						continue;
					}

					const stationLat = station.StationPosition.PositionLat;
					const stationLon = station.StationPosition.PositionLon;

					const dist = calculateDistance(
						coords.latitude,
						coords.longitude,
						stationLat,
						stationLon
					);

					// Count stations within 1km
					if (dist <= 1000) {
						mrtStations++;
					}

					if (dist < nearestMrtDistance) {
						nearestMrtDistance = dist;
						nearestMrtName = station.StationName?.Zh_tw ?? station.StationName?.En ?? '';
					}
				}
			}
		}

		// Fetch Bus stops within 500m
		await rateLimit('tdx', RATE_LIMITS.TDX);
		const busUrl = `https://tdx.transportdata.tw/api/basic/v2/Bus/Stop/City/Taipei?%24format=JSON&%24spatialFilter=nearby(${coords.latitude},${coords.longitude},500)`;
		
		const busResponse = await fetchWithRetry(
			busUrl,
			{
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json'
				}
			},
			5, // Increased retries for TDX
			3000 // Increased base delay to 3 seconds
		);

		if (busResponse.ok) {
			const busData = await busResponse.json();
			
			if (Array.isArray(busData) && busData.length > 0) {
				for (const stop of busData) {
					if (!stop.StopPosition?.PositionLat || !stop.StopPosition?.PositionLon) {
						continue;
					}

					const stopLat = stop.StopPosition.PositionLat;
					const stopLon = stop.StopPosition.PositionLon;

					const dist = calculateDistance(
						coords.latitude,
						coords.longitude,
						stopLat,
						stopLon
					);

					// Count stops within 500m
					if (dist <= 500) {
						busStops++;
					}

					if (dist < nearestBusDistance) {
						nearestBusDistance = dist;
					}
				}
			}
		}

	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		console.error('Failed to fetch MRT/Bus data:', errorMessage);
		throw new Error(`Impossible de récupérer les données de transport public: ${errorMessage}`);
	}

	// Calculate public transport score based on real data
	// Score 0-100 based on proximity and availability
	let publicTransportScore = 0;

	// MRT stations (max 50 points)
	if (nearestMrtDistance < 300) {
		publicTransportScore += 50; // Very close to MRT
	} else if (nearestMrtDistance < 500) {
		publicTransportScore += 40; // Close to MRT
	} else if (nearestMrtDistance < 1000) {
		publicTransportScore += 25; // Within 1km
	} else if (mrtStations > 0) {
		publicTransportScore += 10; // Has MRT but far
	}

	// Multiple MRT stations nearby (bonus)
	if (mrtStations > 1) {
		publicTransportScore += Math.min(15, (mrtStations - 1) * 5);
	}

	// Bus stops (max 30 points)
	if (nearestBusDistance < 200) {
		publicTransportScore += 30; // Very close to bus stop
	} else if (nearestBusDistance < 500) {
		publicTransportScore += 20; // Close to bus stop
	} else if (busStops > 0) {
		publicTransportScore += 10; // Has bus stops but far
	}

	// Multiple bus stops nearby (bonus)
	if (busStops > 3) {
		publicTransportScore += Math.min(10, (busStops - 3) * 2);
	}

	// Cap at 100
	publicTransportScore = Math.min(100, publicTransportScore);

		// If no transport found, score remains 0 (no fallback)

	// Other convenience metrics remain mock for now
	const trashCollectionPoints = Math.floor(Math.random() * 3); // 0-2 points
	const waterPoints = Math.floor(Math.random() * 5); // 0-4 points

	const result: ConvenienceData = {
		youbikeStations,
		nearestYoubikeDistance: nearestDistance === Infinity ? 3000 : Math.round(nearestDistance),
		nearestYoubikeName: nearestName,
		trashCollectionPoints,
		waterPoints,
		publicTransportScore: Math.round(publicTransportScore)
	};

	// Cache the result
	setCached(cacheKey, result, CACHE_TTL.TDX);
	return result;
}

/**
 * Fetch zoning data using OpenStreetMap Overpass API
 * Checks for adjacent industrial zones and high-intensity commercial areas
 */
export async function fetchZoningData(coords: AddressCoordinates): Promise<ZoningData> {
	const { latitude, longitude } = coords;
	
	// Check cache first
	const cacheKey = getCacheKey('zoning', coords);
	const cached = getCached<ZoningData>(cacheKey);
	if (cached) {
		console.log('✅ Using cached zoning data');
		return cached;
	}
	
	// Overpass API query to get landuse tags within 200m
	// This checks for industrial and commercial zones nearby
	const overpassQuery = `[out:json];
(
  way["landuse"="industrial"](around:200, ${latitude}, ${longitude});
  way["landuse"="commercial"](around:200, ${latitude}, ${longitude});
  way["landuse"="retail"](around:200, ${latitude}, ${longitude});
  relation["landuse"="industrial"](around:200, ${latitude}, ${longitude});
  relation["landuse"="commercial"](around:200, ${latitude}, ${longitude});
  relation["landuse"="retail"](around:200, ${latitude}, ${longitude});
);
out center;`;

	try {
		const data = await queryOverpassAPI(overpassQuery);
		const elements = data.elements || [];

		let adjacentIndustrial = false;
		let adjacentHighIntensityCommercial = false;
		let commercialCount = 0;

		for (const element of elements) {
			const landuse = element.tags?.landuse;
			
			if (landuse === 'industrial') {
				adjacentIndustrial = true;
			} else if (landuse === 'commercial' || landuse === 'retail') {
				commercialCount++;
				adjacentHighIntensityCommercial = true;
			}
		}

		// Future development risk is harder to determine without government data
		// For now, base it on current zoning: industrial areas have higher risk
		// Commercial areas have moderate risk
		let futureDevelopmentRisk = 0;
		if (adjacentIndustrial) {
			futureDevelopmentRisk = 3 + Math.random() * 2; // 3-5 (high risk)
		} else if (adjacentHighIntensityCommercial && commercialCount > 2) {
			futureDevelopmentRisk = 2 + Math.random() * 2; // 2-4 (moderate risk)
		} else if (adjacentHighIntensityCommercial) {
			futureDevelopmentRisk = 1 + Math.random() * 1.5; // 1-2.5 (low-moderate risk)
		} else {
			futureDevelopmentRisk = Math.random() * 1; // 0-1 (low risk)
		}

		const result: ZoningData = {
			adjacentIndustrial,
			adjacentHighIntensityCommercial,
			futureDevelopmentRisk: Math.round(futureDevelopmentRisk * 10) / 10
		};

		// Cache the result
		setCached(cacheKey, result, CACHE_TTL.ZONING);
		return result;

	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : 'Unknown error';
		console.error('Failed to fetch zoning data:', errorMessage);
		throw new Error(`Impossible de récupérer les données de zonage: ${errorMessage}`);
	}
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

	// No geocoding result found - throw error instead of using mock data
	throw new Error(`Impossible de géocoder l'adresse: ${address}`);
}

