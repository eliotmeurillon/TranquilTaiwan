import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getTDXAccessToken } from '$lib/server/tdx-auth';

interface LivabilityScore {
	noiseScore: number;
	airQuality: {
		aqi: number;
		status: string;
	};
	transport: {
		nearestYouBike: string;
		distance: number;
	};
}

interface Coordinates {
	lat: number;
	lon: number;
}

// Haversine formula to calculate distance between two points
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

// Step 1: Geocoding (Nominatim)
async function getCoordinates(address: string): Promise<Coordinates> {
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
			lat: parseFloat(data[0].lat),
			lon: parseFloat(data[0].lon)
		};
	} catch (e) {
		console.error('Geocoding error:', e);
		throw error(400, 'Could not locate address');
	}
}

// Step 2: Air Quality (MOENV)
async function getAirQuality(lat: number, lon: number): Promise<{ aqi: number; status: string }> {
	const API_KEY = env.MOENV_API_KEY;
	if (!API_KEY) {
		throw new Error('MOENV_API_KEY is not configured');
	}
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
			const dist = calculateDistance(lat, lon, parseFloat(record.latitude), parseFloat(record.longitude));
			if (dist < minDistance) {
				minDistance = dist;
				nearestStation = record;
			}
		}

		if (nearestStation) {
			return {
				aqi: parseInt(nearestStation.aqi, 10) || 0,
				status: nearestStation.status || 'Unknown'
			};
		}
		
		throw new Error('No nearby station found');

	} catch (e) {
		console.error('Air Quality API error:', e);
		if (e instanceof Error) {
			throw e;
		}
		throw new Error('Failed to fetch air quality data');
	}
}

// Step 3: Noise (using Overpass API)
async function calculateNoiseScore(lat: number, lon: number): Promise<number> {
	// Import the real noise data fetcher
	const { fetchNoiseData } = await import('./dataFetchers');
	const { calculateNoiseScore: calcScore } = await import('./scoreCalculator');
	
	try {
		const noiseData = await fetchNoiseData({ latitude: lat, longitude: lon });
		return calcScore(noiseData);
	} catch (e) {
		console.error('Noise score calculation error:', e);
		if (e instanceof Error) {
			throw e;
		}
		throw new Error('Failed to calculate noise score');
	}
}

// Step 4: Transport (YouBike)
async function getTransportInfo(lat: number, lon: number): Promise<{ nearestYouBike: string; distance: number }> {
	const url = 'https://tdx.transportdata.tw/api/basic/v2/Bike/Station/City/Taipei?%24format=JSON';

	try {
		// Retrieve token via TDX auth service
		const token = await getTDXAccessToken();

		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json'
			}
		});
		
		if (!response.ok) {
			throw new Error(`YouBike API failed: ${response.statusText}`);
		}

		const data = await response.json();
		
		if (!data || data.length === 0) {
			throw new Error('No YouBike data available');
		}

		let nearestStationName = '';
		let minDistance = Infinity;

		for (const station of data) {
			if (!station.StationPosition || !station.StationPosition.PositionLat || !station.StationPosition.PositionLon) continue;
			
			const stationLat = station.StationPosition.PositionLat;
			const stationLon = station.StationPosition.PositionLon;
			
			const dist = calculateDistance(lat, lon, stationLat, stationLon);
			
			if (dist < minDistance) {
				minDistance = dist;
				nearestStationName = station.StationName.Zh_tw;
			}
		}

		if (nearestStationName) {
			return {
				nearestYouBike: nearestStationName,
				distance: Math.round(minDistance)
			};
		}

		throw new Error('No nearby YouBike station found');

	} catch (e) {
		console.error('Transport API error:', e);
		if (e instanceof Error) {
			throw e;
		}
		throw new Error('Failed to fetch transport data');
	}
}

export async function getLivabilityScore(address: string): Promise<LivabilityScore> {
	// Step 1: Geocode
	const coords = await getCoordinates(address);

	// Step 2, 3, 4: Parallel Fetching
	const [airQuality, noiseScore, transport] = await Promise.all([
		getAirQuality(coords.lat, coords.lon),
		calculateNoiseScore(coords.lat, coords.lon),
		getTransportInfo(coords.lat, coords.lon)
	]);

	return {
		noiseScore,
		airQuality,
		transport
	};
}

