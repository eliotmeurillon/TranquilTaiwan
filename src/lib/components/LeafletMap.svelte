<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		latitude: number;
		longitude: number;
		address: string;
		noiseScore?: number;
		airQualityScore?: number;
		zoom?: number;
	}

	let { 
		latitude, 
		longitude, 
		address,
		noiseScore = 0,
		airQualityScore = 0,
		zoom = 15
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = null;
	let noiseHeatLayer: any = null;
	let airQualityHeatLayer: any = null;
	let L: any = null;
	let controlsElement: any = null;
	
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

		// Generate heatmap data points
		const noisePoints = generateHeatmapPoints(latitude, longitude, noiseScore, 20);
		const airQualityPoints = generateHeatmapPoints(latitude, longitude, airQualityScore, 20);

		// Add noise heatmap layer
		noiseHeatLayer = (L as any).heatLayer(noisePoints, {
			radius: 25,
			blur: 15,
			maxZoom: 17,
			max: 1.0,
			gradient: {
				0.0: 'blue',
				0.2: 'cyan',
				0.4: 'lime',
				0.6: 'yellow',
				0.8: 'orange',
				1.0: 'red'
			}
		}).addTo(map);

		// Add air quality heatmap layer
		airQualityHeatLayer = (L as any).heatLayer(airQualityPoints, {
			radius: 25,
			blur: 15,
			maxZoom: 17,
			max: 1.0,
			gradient: {
				0.0: 'green',
				0.2: 'lime',
				0.4: 'yellow',
				0.6: 'orange',
				0.8: 'red',
				1.0: 'darkred'
			}
		}).addTo(map);

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

	function generateHeatmapPoints(
		centerLat: number,
		centerLng: number,
		score: number,
		count: number
	): [number, number, number][] {
		const points: [number, number, number][] = [];
		// Convert score to intensity (lower score = higher intensity for heatmap)
		const baseIntensity = Math.max(0.1, (100 - score) / 100);
		
		// Add center point with highest intensity
		points.push([centerLat, centerLng, baseIntensity]);
		
		// Generate surrounding points
		for (let i = 0; i < count; i++) {
			const angle = (Math.PI * 2 * i) / count;
			const distance = 0.005 + Math.random() * 0.01; // ~500m-1.5km
			const lat = centerLat + distance * Math.cos(angle);
			const lng = centerLng + distance * Math.sin(angle);
			const intensity = baseIntensity * (0.3 + Math.random() * 0.7); // Vary intensity
			
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
		noiseCheckbox.checked = true;
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
		airCheckbox.checked = true;
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
			if (map && noiseHeatLayer) {
				if ((e.target as HTMLInputElement).checked) {
					map.addLayer(noiseHeatLayer);
				} else {
					map.removeLayer(noiseHeatLayer);
				}
			}
		});

		airCheckbox.addEventListener('change', (e) => {
			if (map && airQualityHeatLayer) {
				if ((e.target as HTMLInputElement).checked) {
					map.addLayer(airQualityHeatLayer);
				} else {
					map.removeLayer(airQualityHeatLayer);
				}
			}
		});

		// Add to map using Leaflet control system
		const customControl = L.control({ position: 'topleft' });
		customControl.onAdd = () => controls;
		customControl.addTo(map);
	}
</script>

<div class="w-full h-full">
	<div bind:this={mapContainer} class="w-full h-full rounded-lg z-0"></div>
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

