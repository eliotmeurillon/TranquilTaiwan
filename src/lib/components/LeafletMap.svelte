<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import DynamicHeatmapLayer from './DynamicHeatmapLayer.svelte';

	// Define PointOfInterest type
	export type PointOfInterest = {
		type: 'temple' | 'accident' | 'factory' | 'youbike' | 'transport' | 'trash';
		latitude: number;
		longitude: number;
		label: string;
		details?: string;
	};

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
		pointsOfInterest?: PointOfInterest[];
		noiseVisible?: boolean;
		airQualityVisible?: boolean;
		safetyPointsVisible?: boolean;
	}

	let { 
		latitude, 
		longitude, 
		address,
		noiseScore = 0,
		airQualityScore = 0,
		zoom = 15,
		detailedData,
		pointsOfInterest = [],
		noiseVisible = $bindable(true),
		airQualityVisible = $bindable(false),
		safetyPointsVisible = $bindable(false)
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = $state(null);
	let L: any = $state(null);
	let nuisanceLayer: any = $state(null);
	let amenityLayer: any = $state(null);
	let safetyPointsLayer: any = $state(null);
	let airQualityLayer: any = $state(null);
	let circle: any = $state(null);
	
	// Lucide Icons SVG paths
	const ICONS = {
		house: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
		temple: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`, // Bell
		accident: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`, // TriangleAlert
		factory: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`,
		youbike: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`, // Bike
		transport: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/></svg>`, // TrainFront
		trash: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>` // Trash2
	};

	let heatmapPoints = $derived.by(() => {
		const points: [number, number, number][] = [];
		
		pointsOfInterest.forEach(poi => {
			let intensity = 0.5;
			if (poi.type === 'temple') intensity = 0.8;
			else if (poi.type === 'accident') intensity = 0.9;
			else if (poi.type === 'factory') intensity = 0.7;
			else if (poi.type === 'transport') intensity = 0.4;
			
			points.push([poi.latitude, poi.longitude, intensity]);
		});
		
		return points;
	});

	onMount(async () => {
		if (!browser) return;

		// Patch HTMLCanvasElement.getContext to add willReadFrequently for leaflet.heat
		const originalGetContext = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function(
			contextType: '2d' | 'bitmaprenderer' | 'webgl' | 'webgl2',
			options?: CanvasRenderingContext2DSettings | ImageBitmapRenderingContextSettings | WebGLContextAttributes
		) {
			if (contextType === '2d') {
				const context2DSettings = (options || {}) as CanvasRenderingContext2DSettings;
				options = { ...context2DSettings, willReadFrequently: true };
			}
			return originalGetContext.call(this, contextType, options);
		} as typeof HTMLCanvasElement.prototype.getContext;

		const leafletModule = await import('leaflet');
		L = leafletModule.default;
		
		await import('leaflet.heat');
		await import('leaflet/dist/leaflet.css');

		if (!L) return;

		map = L.map(mapContainer, {
			center: [latitude, longitude],
			zoom: zoom,
			zoomControl: false,
			layers: []
		});

		L.control.zoom({
			position: 'bottomright'
		}).addTo(map);

		// Minimalist CartoDB Light
		L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
			maxZoom: 20
		}).addTo(map);

		// 1. Main Marker (Home)
		// Use inner wrapper for styling to avoid Leaflet container conflicts
		const houseIcon = L.divIcon({
			className: 'bg-transparent border-0', 
			html: `
				<div class="w-full h-full bg-[#1D1D1F] text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white">
					<div class="w-6 h-6">
						${ICONS.house}
					</div>
				</div>
			`,
			iconSize: [48, 48],
			iconAnchor: [24, 24],
			popupAnchor: [0, -24]
		});

		L.marker([latitude, longitude], { icon: houseIcon })
			.bindPopup(`<div class="p-2 text-center font-sans"><strong class="text-[#1D1D1F] text-sm">${address}</strong><br/><span class="text-[#86868B] text-xs">Target Location</span></div>`)
			.addTo(map)
			.openPopup();

		// 2. 500m Radius Circle
		circle = L.circle([latitude, longitude], {
			color: '#86868B', // System Gray
			fillColor: '#8E8E93',
			fillOpacity: 0.05,
			weight: 1,
			dashArray: '6, 6',
			radius: 500
		}).addTo(map);

		// Layer Groups
		nuisanceLayer = L.layerGroup().addTo(map);
		amenityLayer = L.layerGroup().addTo(map);
		safetyPointsLayer = L.layerGroup();
		airQualityLayer = L.layerGroup();
		
		// Initialize visibility
		noiseVisible = true;
		airQualityVisible = false;
		safetyPointsVisible = false;

		// Custom Marker Creator
		const createCustomMarker = (poi: PointOfInterest) => {
			let iconHtml = '';
			let bgClass = '';
			
			// Base classes for consistent modern look
			const baseClass = 'w-full h-full rounded-full border-[3px] border-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center text-white bg-opacity-95 backdrop-blur-sm';

			switch (poi.type) {
				// Nuisances
				case 'temple':
					iconHtml = ICONS.temple;
					bgClass = 'bg-[#FF9500]'; // System Orange
					break;
				case 'accident':
					iconHtml = ICONS.accident;
					bgClass = 'bg-[#FF3B30]'; // System Red
					break;
				case 'factory':
					iconHtml = ICONS.factory;
					bgClass = 'bg-[#8E8E93]'; // System Gray
					break;
				// Amenities
				case 'youbike':
					iconHtml = ICONS.youbike;
					bgClass = 'bg-[#34C759]'; // System Green
					break;
				case 'transport':
					iconHtml = ICONS.transport;
					bgClass = 'bg-[#007AFF]'; // System Blue
					break;
				case 'trash':
					iconHtml = ICONS.trash;
					bgClass = 'bg-[#AF52DE]'; // System Purple
					break;
			}

			const customIcon = L.divIcon({
				className: 'bg-transparent border-0', // Clear Leaflet default box
				html: `
					<div class="${baseClass} ${bgClass}">
						<div class="w-5 h-5">
							${iconHtml}
						</div>
					</div>
				`,
				iconSize: [40, 40], // Slightly larger for better visibility
				iconAnchor: [20, 20],
				popupAnchor: [0, -20]
			});

			return L.marker([poi.latitude, poi.longitude], { icon: customIcon })
				.bindTooltip(`
					<div class="font-bold text-sm font-sans text-[#1D1D1F]">${poi.label}</div>
					${poi.details ? `<div class="text-xs text-[#86868B] font-sans">${poi.details}</div>` : ''}
				`, { 
					direction: 'top', 
					offset: [0, -12], 
					opacity: 1,
					className: 'glass-tooltip' // Will use global CSS or specific style
				});
		};

		// Populate Layers
		pointsOfInterest.forEach(poi => {
			const marker = createCustomMarker(poi);
			if (poi.type === 'accident') {
				marker.addTo(safetyPointsLayer);
			} else if (['temple', 'factory'].includes(poi.type)) {
				marker.addTo(nuisanceLayer);
			} else {
				marker.addTo(amenityLayer);
			}
		});
	});
	
	// React to visibility changes
	$effect(() => {
		if (!map) return;
		
		// Air Quality
		if (airQualityVisible && airQualityLayer && !map.hasLayer(airQualityLayer)) {
			map.addLayer(airQualityLayer);
		} else if (!airQualityVisible && airQualityLayer && map.hasLayer(airQualityLayer)) {
			map.removeLayer(airQualityLayer);
		}
		
		// Safety Points
		if (safetyPointsVisible && safetyPointsLayer && !map.hasLayer(safetyPointsLayer)) {
			map.addLayer(safetyPointsLayer);
		} else if (!safetyPointsVisible && safetyPointsLayer && map.hasLayer(safetyPointsLayer)) {
			map.removeLayer(safetyPointsLayer);
		}
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});
</script>

<div class="w-full h-full relative">
	<div bind:this={mapContainer} class="w-full h-full z-0"></div>
	{#if map && L}
		<DynamicHeatmapLayer 
			{map} 
			leaflet={L} 
			points={heatmapPoints}
			isVisible={noiseVisible}
			gradient={{
				0.4: 'blue',
				0.6: 'cyan',
				0.7: 'lime',
				0.8: 'yellow',
				1.0: 'red'
			}}
		/>
	{/if}
</div>

<style>
	:global(.leaflet-popup-content-wrapper) {
		border-radius: 14px;
		padding: 0;
		box-shadow: 0 16px 48px rgba(0,0,0,0.14);
		background: rgba(255, 255, 255, 0.94);
		backdrop-filter: blur(20px);
	}
	
	:global(.leaflet-popup-content) {
		margin: 0;
		padding: 0;
	}
	
	:global(.leaflet-div-icon) {
		background: transparent;
		border: none;
	}

	:global(.leaflet-bottom.leaflet-right) {
		bottom: 140px !important;
		right: 20px !important;
	}
	
	:global(.leaflet-top.leaflet-right .leaflet-control-layers) {
		display: none !important;
	}
	
	/* Tooltip styling */
	:global(.leaflet-tooltip) {
		border-radius: 10px;
		border: 0.5px solid rgba(0,0,0,0.04) !important;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
		padding: 6px 10px !important;
		background: rgba(255, 255, 255, 0.92) !important;
		backdrop-filter: blur(10px);
	}
</style>
