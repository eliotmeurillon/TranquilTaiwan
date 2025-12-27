<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';
	import DynamicHeatmapLayer from './DynamicHeatmapLayer.svelte';
	import { Layers } from 'lucide-svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';

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
	}

	let { 
		latitude, 
		longitude, 
		address,
		noiseScore = 0,
		airQualityScore = 0,
		zoom = 15,
		detailedData,
		pointsOfInterest = []
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = $state(null);
	let L: any = $state(null);
	let layersControl: any = $state(null);
	let nuisanceLayer: any = $state(null);
	let amenityLayer: any = $state(null);
	let circle: any = $state(null);
	let showLayersPopover = $state(false);
	
	// Reactive layer visibility states
	let nuisanceVisible = $state(true);
	let amenityVisible = $state(true);
	let circleVisible = $state(true);
	
	// Icon SVG paths
	const ICONS = {
		house: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
		temple: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>`, // Bell
		accident: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>`, // AlertTriangle
		factory: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" /></svg>`,
		youbike: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>`, // Bike
		transport: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2" /><path d="M4 11h16" /><path d="M12 3v8" /><path d="m8 19-2 3" /><path d="m18 22-2-3" /><path d="M8 15h0" /><path d="M16 15h0" /></svg>`, // Train
		trash: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>`
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
		// This fixes the Canvas2D warning about multiple readback operations
		const originalGetContext = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function(
			contextType: '2d' | 'bitmaprenderer' | 'webgl' | 'webgl2',
			options?: CanvasRenderingContext2DSettings | ImageBitmapRenderingContextSettings | WebGLContextAttributes
		) {
			if (contextType === '2d') {
				// Merge willReadFrequently into options (or create new options object)
				const context2DSettings = (options || {}) as CanvasRenderingContext2DSettings;
				options = { ...context2DSettings, willReadFrequently: true };
			}
			return originalGetContext.call(this, contextType, options);
		} as typeof HTMLCanvasElement.prototype.getContext;

		// Dynamically import Leaflet only on client side
		const leafletModule = await import('leaflet');
		L = leafletModule.default;
		
		// Import leaflet.heat plugin (will use patched getContext)
		await import('leaflet.heat');
		
		// Import CSS
		await import('leaflet/dist/leaflet.css');

		if (!L) return;

		// Initialize map
		map = L.map(mapContainer, {
			center: [latitude, longitude],
			zoom: zoom,
			zoomControl: false,
			layers: [] // Initialize empty, we add layers below
		});

		// Add zoom control to bottom right
		L.control.zoom({
			position: 'bottomright'
		}).addTo(map);

		// Add CartoDB Positron tile layer (Minimalist B&W)
		const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			maxZoom: 20
		}).addTo(map);

		// 1. Main Marker (Apartment)
		const houseIcon = L.divIcon({
			className: 'bg-slate-900 text-white rounded-full p-2 shadow-xl border-2 border-white',
			html: ICONS.house,
			iconSize: [40, 40],
			iconAnchor: [20, 20],
			popupAnchor: [0, -20]
		});

		const mainMarker = L.marker([latitude, longitude], { icon: houseIcon })
			.bindPopup(`<div class="p-2 text-center"><strong>${address}</strong><br/>Your Future Home? 🏠</div>`)
			.addTo(map)
			.openPopup();

		// 2. 500m Radius Circle
		circle = L.circle([latitude, longitude], {
			color: '#94a3b8', // Slate-400
			fillColor: '#94a3b8',
			fillOpacity: 0.05,
			weight: 1,
			dashArray: '5, 5',
			radius: 500
		}).addTo(map);

		// Layer Groups
		nuisanceLayer = L.layerGroup().addTo(map);
		amenityLayer = L.layerGroup().addTo(map);
		
		// Initialize visibility states
		nuisanceVisible = true;
		amenityVisible = true;
		circleVisible = true;

		// Helper to create custom marker
		const createCustomMarker = (poi: PointOfInterest) => {
			let iconHtml = '';
			let markerClass = '';
			
			// Common base classes: rounded circle, white border, shadow, flex center
			const baseClass = 'rounded-full p-1 shadow-md border-2 border-white flex items-center justify-center text-white';

			switch (poi.type) {
				// Nuisances
				case 'temple':
					iconHtml = ICONS.temple;
					markerClass = `bg-orange-500 ${baseClass}`;
					break;
				case 'accident':
					iconHtml = ICONS.accident;
					markerClass = `bg-red-600 ${baseClass}`;
					break;
				case 'factory':
					iconHtml = ICONS.factory;
					markerClass = `bg-slate-600 ${baseClass}`;
					break;
				// Amenities
				case 'youbike':
					iconHtml = ICONS.youbike;
					markerClass = `bg-emerald-500 ${baseClass}`;
					break;
				case 'transport':
					iconHtml = ICONS.transport;
					markerClass = `bg-blue-500 ${baseClass}`;
					break;
				case 'trash':
					iconHtml = ICONS.trash;
					markerClass = `bg-lime-600 ${baseClass}`;
					break;
			}

			const customIcon = L.divIcon({
				className: markerClass,
				html: iconHtml,
				iconSize: [32, 32], // Slightly larger for better visibility
				iconAnchor: [16, 16],
				popupAnchor: [0, -16]
			});

			const marker = L.marker([poi.latitude, poi.longitude], { icon: customIcon })
				.bindTooltip(`
					<div class="font-bold text-sm">${poi.label}</div>
					${poi.details ? `<div class="text-xs text-gray-500">${poi.details}</div>` : ''}
				`, { 
					direction: 'top', 
					offset: [0, -10], 
					opacity: 0.9,
					className: 'px-2 py-1'
				});
			
			return marker;
		};

		// 3. Populate Layers
		pointsOfInterest.forEach(poi => {
			const marker = createCustomMarker(poi);
			if (['temple', 'accident', 'factory'].includes(poi.type)) {
				marker.addTo(nuisanceLayer);
			} else {
				marker.addTo(amenityLayer);
			}
		});

		// 4. Layers Control - Store reference but don't add to map (we'll use custom button)
		const overlayMaps = {
			"Nuisances & Dangers ⚠️": nuisanceLayer,
			"Amenities 🚲": amenityLayer,
			"500m Radius": circle
		};

		// Create layers control but don't add it to map - we'll use custom UI
		layersControl = L.control.layers(null, overlayMaps, { position: 'topright' });
		// Don't add to map - we'll use custom button instead
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
			gradient={{
				0.4: 'blue',
				0.6: 'cyan',
				0.7: 'lime',
				0.8: 'yellow',
				1.0: 'red'
			}}
		/>
	{/if}
	
	<!-- Custom Layers Control Button -->
	{#if map && L && nuisanceLayer && amenityLayer && circle}
		<div class="absolute top-24 right-4 z-[40] pointer-events-auto">
			<Popover.Root bind:open={showLayersPopover}>
				<Popover.Trigger asChild>
					{#snippet child(builder)}
						<Button
							{...builder}
							variant="outline"
							size="icon"
							class="bg-white/90 backdrop-blur-md shadow-lg hover:bg-white rounded-full border border-slate-200/50"
							aria-label="Toggle layers"
						>
							<Layers class="w-5 h-5 text-slate-700" strokeWidth={1.5} />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-64 p-2 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/50 rounded-xl">
					<div class="space-y-2">
						<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={nuisanceVisible}
								onchange={() => {
									if (nuisanceVisible && nuisanceLayer) {
										map.addLayer(nuisanceLayer);
									} else if (!nuisanceVisible && nuisanceLayer) {
										map.removeLayer(nuisanceLayer);
									}
								}}
								class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
							/>
							<span class="text-sm font-medium text-slate-700">Nuisances & Dangers ⚠️</span>
						</label>
						<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={amenityVisible}
								onchange={() => {
									if (amenityVisible && amenityLayer) {
										map.addLayer(amenityLayer);
									} else if (!amenityVisible && amenityLayer) {
										map.removeLayer(amenityLayer);
									}
								}}
								class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
							/>
							<span class="text-sm font-medium text-slate-700">Amenities 🚲</span>
						</label>
						<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={circleVisible}
								onchange={() => {
									if (circleVisible && circle) {
										map.addLayer(circle);
									} else if (!circleVisible && circle) {
										map.removeLayer(circle);
									}
								}}
								class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
							/>
							<span class="text-sm font-medium text-slate-700">500m Radius</span>
						</label>
					</div>
				</Popover.Content>
			</Popover.Root>
		</div>
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
	
	/* Ensure icons are centered */
	:global(.leaflet-div-icon) {
		background: transparent;
		border: none;
	}

	:global(.leaflet-bottom.leaflet-right) {
		bottom: 140px !important; /* Remonte franchement au-dessus du dégradé */
		right: 20px !important;
	}
	
	/* Hide default layers control if it somehow appears */
	:global(.leaflet-top.leaflet-right .leaflet-control-layers) {
		display: none !important;
	}
</style>