/**
 * Score Calculator Service
 * Calculates livability scores based on various data sources
 */

export interface AddressCoordinates {
	latitude: number;
	longitude: number;
}

export interface ScoreBreakdown {
	overall: number;
	noise: number;
	airQuality: number;
	safety: number;
	convenience: number;
	zoningRisk: number;
	rawData: {
		noise: NoiseData;
		airQuality: AirQualityData;
		safety: SafetyData;
		convenience: ConvenienceData;
		zoning: ZoningData;
	};
}

export interface NoiseData {
	level: number; // dB
	nearbyTemples: number;
	majorRoads: number;
	trafficIntensity: number;
}

export interface AirQualityData {
	pm25: number;
	aqi: number;
	dengueRisk: boolean;
	historicalDengueCases: number;
}

export interface SafetyData {
	accidentHotspots: number;
	crimeRate: number;
	pedestrianSafety: number;
}

export interface ConvenienceData {
	youbikeStations: number;
	nearestYoubikeDistance: number; // meters
	trashCollectionPoints: number;
	waterPoints: number;
	publicTransportScore: number;
}

export interface ZoningData {
	adjacentIndustrial: boolean;
	adjacentHighIntensityCommercial: boolean;
	futureDevelopmentRisk: number;
}

/**
 * Calculate noise score (0-100, higher = quieter)
 */
export function calculateNoiseScore(data: NoiseData): number {
	let score = 100;
	
	// Penalize high noise levels (Leq)
	if (data.level > 70) score -= 30;
	else if (data.level > 65) score -= 20;
	else if (data.level > 60) score -= 10;
	else if (data.level > 55) score -= 5;
	
	// Penalize nearby temples (festival noise)
	score -= data.nearbyTemples * 5;
	
	// Penalize major roads
	score -= data.majorRoads * 3;
	
	// Penalize high traffic intensity
	score -= data.trafficIntensity * 2;
	
	return Math.max(0, Math.min(100, score));
}

/**
 * Calculate air quality score (0-100, higher = better)
 */
export function calculateAirQualityScore(data: AirQualityData): number {
	let score = 100;
	
	// PM2.5 impact (Taiwan standard: <15 = good, 15-35 = moderate, >35 = unhealthy)
	if (data.pm25 > 35) score -= 40;
	else if (data.pm25 > 25) score -= 25;
	else if (data.pm25 > 15) score -= 10;
	
	// AQI impact
	if (data.aqi > 150) score -= 30;
	else if (data.aqi > 100) score -= 15;
	else if (data.aqi > 50) score -= 5;
	
	// Dengue risk (especially relevant for southern Taiwan)
	if (data.dengueRisk) score -= 20;
	if (data.historicalDengueCases > 10) score -= 10;
	
	return Math.max(0, Math.min(100, score));
}

/**
 * Calculate safety score (0-100, higher = safer)
 */
export function calculateSafetyScore(data: SafetyData): number {
	let score = 100;
	
	// Accident hotspots
	score -= data.accidentHotspots * 10;
	
	// Crime rate (normalized 0-1 scale)
	score -= data.crimeRate * 30;
	
	// Pedestrian safety
	score -= (100 - data.pedestrianSafety) * 0.3;
	
	return Math.max(0, Math.min(100, score));
}

/**
 * Calculate convenience score (0-100, higher = more convenient)
 */
export function calculateConvenienceScore(data: ConvenienceData): number {
	let score = 0;
	
	// YouBike availability (max 30 points)
	if (data.nearestYoubikeDistance < 200) score += 30;
	else if (data.nearestYoubikeDistance < 500) score += 20;
	else if (data.nearestYoubikeDistance < 1000) score += 10;
	
	// Multiple YouBike stations nearby
	score += Math.min(20, data.youbikeStations * 5);
	
	// Trash collection points
	score += Math.min(15, data.trashCollectionPoints * 3);
	
	// Water points
	score += Math.min(10, data.waterPoints * 2);
	
	// Public transport
	score += data.publicTransportScore * 0.25;
	
	return Math.max(0, Math.min(100, score));
}

/**
 * Calculate zoning risk score (0-100, higher = lower risk)
 */
export function calculateZoningRiskScore(data: ZoningData): number {
	let score = 100;
	
	// Adjacent industrial zones are high risk
	if (data.adjacentIndustrial) score -= 40;
	
	// High intensity commercial can be noisy
	if (data.adjacentHighIntensityCommercial) score -= 20;
	
	// Future development risk
	score -= data.futureDevelopmentRisk * 10;
	
	return Math.max(0, Math.min(100, score));
}

/**
 * Calculate overall livability score
 */
export function calculateOverallScore(breakdown: Omit<ScoreBreakdown, 'overall' | 'rawData'>): number {
	// Weighted average
	const weights = {
		noise: 0.25,
		airQuality: 0.25,
		safety: 0.20,
		convenience: 0.15,
		zoningRisk: 0.15
	};
	
	const overall = 
		breakdown.noise * weights.noise +
		breakdown.airQuality * weights.airQuality +
		breakdown.safety * weights.safety +
		breakdown.convenience * weights.convenience +
		breakdown.zoningRisk * weights.zoningRisk;
	
	return Math.round(overall * 100) / 100;
}

/**
 * Main function to calculate all scores
 */
export function calculateAllScores(
	noiseData: NoiseData,
	airQualityData: AirQualityData,
	safetyData: SafetyData,
	convenienceData: ConvenienceData,
	zoningData: ZoningData
): ScoreBreakdown {
	const noise = calculateNoiseScore(noiseData);
	const airQuality = calculateAirQualityScore(airQualityData);
	const safety = calculateSafetyScore(safetyData);
	const convenience = calculateConvenienceScore(convenienceData);
	const zoningRisk = calculateZoningRiskScore(zoningData);
	
	const overall = calculateOverallScore({
		noise,
		airQuality,
		safety,
		convenience,
		zoningRisk
	});
	
	return {
		overall,
		noise,
		airQuality,
		safety,
		convenience,
		zoningRisk,
		rawData: {
			noise: noiseData,
			airQuality: airQualityData,
			safety: safetyData,
			convenience: convenienceData,
			zoning: zoningData
		}
	};
}

