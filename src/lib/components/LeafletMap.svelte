<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';
	import DynamicHeatmapLayer from './DynamicHeatmapLayer.svelte';

	interface Props {
		latitude: number;
		longitude: number;
		address: string;
		noiseScore?: number;
		airQualityScore?: number;
		zoom?: number;
		detailedData?: {
			noise?: {
				level: number;
				nearbyTemples: number;
				majorRoads: number;
				trafficIntensity: number;
			};
			airQuality?: {
				pm25: number;
				aqi: number;
				dengueRisk: boolean;
				historicalDengueCases: number;
			};
		};
	}

	let { 
		latitude, 
		longitude, 
		address,
		noiseScore = 0,
		airQualityScore = 0,
		zoom = 15,
		detailedData
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = $state(null);
	let L: any = $state(null);
	let controlsElement: any = null;
	
	let noisePoints: [number, number, number][] = $state([]);
	let airQualityPoints: [number, number, number][] = $state([]);
	let isNoiseVisible = $state(true);
	let isAirVisible = $state(true);

	const isoplethGradient = {
		0.0: '#000080', // Dark Blue
		0.2: '#0000CD', // Medium Blue
		0.4: '#008000', // Green
		0.6: '#FFFF00', // Yellow
		0.8: '#FFA500', // Orange
		1.0: '#FF0000'  // Red
	};

	const noiseGradient = isoplethGradient;
	const airGradient = isoplethGradient;
	
	// Watch for locale changes to update map labels
	afterNavigate(() => {
		if (controlsElement && map) {
			// Update labels when locale changes
			if (controlsElement.noiseLabel) {
				controlsElement.noiseLabel.textContent = m.map_heatmap_toggle_noise();
			}
			if (controlsElement.airLabel) {
				controlsElement.airLabel.textContent = m.map_heatmap_toggle_air();
			}
		}
	});

	onMount(async () => {
		if (!browser) return;

		// Dynamically import Leaflet only on client side
		const leafletModule = await import('leaflet');
		L = leafletModule.default;
		
		// Import leaflet.heat
		await import('leaflet.heat');
		
		// Import CSS
		await import('leaflet/dist/leaflet.css');

		// Fix for default marker icons in Leaflet with Vite
		delete (L.Icon.Default.prototype as any)._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
			iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
			shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
		});

		if (!L) return;

		// Initialize map
		map = L.map(mapContainer, {
			center: [latitude, longitude],
			zoom: zoom,
			zoomControl: true
		});

		// Add OpenStreetMap tile layer
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19
		}).addTo(map);

		// Add marker for the address
		const marker = L.marker([latitude, longitude])
			.addTo(map)
			.bindPopup(`<div class="p-2"><strong>${address}</strong></div>`)
			.openPopup();

		// Generate heatmap data points using real data if available
		noisePoints = generateNoiseHeatmapPoints(latitude, longitude, noiseScore, detailedData?.noise);
		airQualityPoints = generateAirQualityHeatmapPoints(latitude, longitude, airQualityScore, detailedData?.airQuality);

		// Add toggle controls
		addHeatmapControls();

		// Cleanup on destroy
		return () => {
			if (map) {
				map.remove();
				map = null;
			}
		};
	});

	function generateNoiseHeatmapPoints(
		centerLat: number,
		centerLng: number,
		score: number,
		noiseData?: { level: number; nearbyTemples: number; majorRoads: number; trafficIntensity: number }
	): [number, number, number][] {
		const points: [number, number, number][] = [];
		
		// Use real noise data if available, otherwise use score
		let baseIntensity: number;
		if (noiseData) {
			// Convert noise level (dB) to intensity (higher dB = higher intensity)
			// Normalize: 40-80 dB range -> 0.2-0.6 intensity (increased from 0.1-0.4)
			const normalizedLevel = Math.min(0.6, Math.max(0.2, (noiseData.level - 40) / 80));
			baseIntensity = normalizedLevel;
			
			// Add points for nearby temples (sources of noise)
			for (let i = 0; i < noiseData.nearbyTemples; i++) {
				const angle = (Math.PI * 2 * i) / Math.max(1, noiseData.nearbyTemples);
				const distance = 0.002 + Math.random() * 0.003; // ~200-500m
				const lat = centerLat + distance * Math.cos(angle);
				const lng = centerLng + distance * Math.sin(angle);
				points.push([lat, lng, baseIntensity * 0.5]); // Increased intensity factor
			}
			
			// Add points for major roads (sources of noise)
			for (let i = 0; i < noiseData.majorRoads; i++) {
				const angle = (Math.PI * 2 * i) / Math.max(1, noiseData.majorRoads);
				const distance = 0.001 + Math.random() * 0.003; // ~100-400m
				const lat = centerLat + distance * Math.cos(angle);
				const lng = centerLng + distance * Math.sin(angle);
				points.push([lat, lng, baseIntensity * 0.4]); // Increased intensity factor
			}
			
			// Add intensity based on traffic
			const trafficIntensity = Math.min(0.5, noiseData.trafficIntensity / 150);
			baseIntensity = Math.max(baseIntensity, trafficIntensity);
		} else {
			// Fallback: use score (lower score = higher intensity for heatmap)
			// Cap at 0.6 max intensity (increased from 0.4)
			baseIntensity = Math.min(0.6, Math.max(0.2, (100 - score) / 200));
		}
		
		// Add center point
		points.push([centerLat, centerLng, baseIntensity * 0.7]); // Increased center intensity
		
		// Generate surrounding points
		const count = noiseData ? 8 : 10;
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count;
			const distance = 0.002 + Math.random() * 0.004; // ~200-600m
			const lat = centerLat + distance * Math.cos(angle);
			const lng = centerLng + distance * Math.sin(angle);
			const intensity = baseIntensity * (0.3 + Math.random() * 0.3); // Increased intensity range
			
			points.push([lat, lng, intensity]);
		}
		
		return points;
	}

	function generateAirQualityHeatmapPoints(
		centerLat: number,
		centerLng: number,
		score: number,
		airQualityData?: { pm25: number; aqi: number; dengueRisk: boolean; historicalDengueCases: number }
	): [number, number, number][] {
		const points: [number, number, number][] = [];
		
		// Use real air quality data if available, otherwise use score
		let baseIntensity: number;
		if (airQualityData) {
			// Convert AQI to intensity (higher AQI = higher intensity for heatmap)
			// Normalize: 0-200 AQI range -> 0.2-0.6 intensity
			const aqiIntensity = Math.min(0.6, Math.max(0.2, airQualityData.aqi / 350));
			
			// Convert PM2.5 to intensity (higher PM2.5 = higher intensity)
			// Normalize: 0-50 μg/m³ range -> 0.2-0.6 intensity
			const pm25Intensity = Math.min(0.6, Math.max(0.2, airQualityData.pm25 / 100));
			
			// Combine both metrics
			baseIntensity = (aqiIntensity + pm25Intensity) / 2;
			
			// Add intensity for dengue risk areas
			if (airQualityData.dengueRisk) {
				baseIntensity = Math.min(0.6, baseIntensity + 0.1);
			}
		} else {
			// Fallback: use score (lower score = higher intensity for heatmap)
			// Cap at 0.6 max intensity
			baseIntensity = Math.min(0.6, Math.max(0.2, (100 - score) / 200));
		}
		
		// Add center point
		points.push([centerLat, centerLng, baseIntensity * 0.7]); // Increased center intensity
		
		// Generate surrounding points
		const count = airQualityData ? 8 : 10;
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count;
			const distance = 0.002 + Math.random() * 0.004; // ~200-600m
			const lat = centerLat + distance * Math.cos(angle);
			const lng = centerLng + distance * Math.sin(angle);
			const intensity = baseIntensity * (0.3 + Math.random() * 0.3); // Increased intensity range
			
			points.push([lat, lng, intensity]);
		}
		
		return points;
	}

	function addHeatmapControls() {
		if (!map || !L) return;

		// Create control container
		const controls = document.createElement('div');
		controls.className = 'leaflet-control leaflet-bar';
		controls.style.cssText = 'background: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.4);';

		// Noise heatmap toggle
		const noiseToggle = document.createElement('div');
		noiseToggle.className = 'mb-2';
		const noiseCheckbox = document.createElement('input');
		noiseCheckbox.type = 'checkbox';
		noiseCheckbox.id = 'noise-heatmap-toggle';
		noiseCheckbox.checked = isNoiseVisible;
		noiseCheckbox.className = 'checkbox checkbox-sm mr-2';
		const noiseLabel = document.createElement('label');
		noiseLabel.htmlFor = 'noise-heatmap-toggle';
		noiseLabel.textContent = m.map_heatmap_toggle_noise();
		noiseLabel.className = 'cursor-pointer';
		noiseToggle.appendChild(noiseCheckbox);
		noiseToggle.appendChild(noiseLabel);

		// Air quality heatmap toggle
		const airToggle = document.createElement('div');
		const airCheckbox = document.createElement('input');
		airCheckbox.type = 'checkbox';
		airCheckbox.id = 'air-heatmap-toggle';
		airCheckbox.checked = isAirVisible;
		airCheckbox.className = 'checkbox checkbox-sm mr-2';
		const airLabel = document.createElement('label');
		airLabel.htmlFor = 'air-heatmap-toggle';
		airLabel.textContent = m.map_heatmap_toggle_air();
		airLabel.className = 'cursor-pointer';
		airToggle.appendChild(airCheckbox);
		airToggle.appendChild(airLabel);
		
		// Store references for updating labels
		(controls as any).noiseLabel = noiseLabel;
		(controls as any).airLabel = airLabel;

		controls.appendChild(noiseToggle);
		controls.appendChild(airToggle);
		
		// Store reference for locale updates
		controlsElement = controls;

		// Add event listeners
		noiseCheckbox.addEventListener('change', (e) => {
			isNoiseVisible = (e.target as HTMLInputElement).checked;
		});

		airCheckbox.addEventListener('change', (e) => {
			isAirVisible = (e.target as HTMLInputElement).checked;
		});

		// Add to map using Leaflet control system
		const customControl = L.control({ position: 'topleft' });
		customControl.onAdd = () => controls;
		customControl.addTo(map);
	}
</script>

<div class="w-full h-full">
	<div bind:this={mapContainer} class="w-full h-full rounded-lg z-0"></div>
	{#if map && L}
		<DynamicHeatmapLayer 
			{map} 
			leaflet={L} 
			points={noisePoints} 
			gradient={noiseGradient}
			isVisible={isNoiseVisible} 
		/>
		<DynamicHeatmapLayer 
			{map} 
			leaflet={L} 
			points={airQualityPoints} 
			gradient={airGradient}
			isVisible={isAirVisible} 
		/>
	{/if}
</div>

<style>
	:global(.leaflet-popup-content-wrapper) {
		border-radius: 8px;
		padding: 0;
	}
	
	:global(.leaflet-popup-content) {
		margin: 0;
		padding: 8px;
	}
</style>

