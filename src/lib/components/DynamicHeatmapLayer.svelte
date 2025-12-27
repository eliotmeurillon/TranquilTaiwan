<script lang="ts">
	import { onDestroy } from 'svelte';
	import * as d3 from 'd3';

	interface Props {
		map: any;
		leaflet: any;
		points: [number, number, number][];
		gradient: Record<string, string>;
		isVisible?: boolean;
	}

	let { map, leaflet: L, points, gradient, isVisible = true }: Props = $props();

	let heatLayer: any = null;
	let contourGroup: any = null; // Group for contour layer

	function getHeatmapOptions(zoom: number) {
		let radius: number;
		let blur: number;
		let maxIntensity: number;
		let minOpacity: number;

		if (zoom > 15) {
			// Zoom Élevé (Vue Quartier)
			radius = 60; // Increased significantly to merge points
			blur = 60;
			maxIntensity = 0.15; // Lower maxIntensity makes colors saturate faster
			minOpacity = 0.6; // High base opacity
		} else if (zoom >= 12 && zoom <= 15) {
			// Zoom Moyen (Vue Ville)
			radius = 45;
			blur = 45;
			maxIntensity = 0.3;
			minOpacity = 0.5;
		} else if (zoom >= 11 && zoom < 12) {
			// Zoom Faible (Vue Région)
			radius = 30;
			blur = 30;
			maxIntensity = 0.8;
			minOpacity = 0.4;
		} else {
			// Zoom très faible (< 11)
			radius = 20;
			blur = 20;
			maxIntensity = 1.5;
			minOpacity = 0.3;
		}

		return { radius, blur, maxIntensity, minOpacity };
	}

	function createOrUpdateLayer() {
		if (!map || !L || !points.length) return;

		const currentZoom = map.getZoom();
		const options = getHeatmapOptions(currentZoom);

		// --- 1. Heatmap Layer (Background) ---
		if (heatLayer) {
			if (map.hasLayer(heatLayer)) {
				map.removeLayer(heatLayer);
			}
		}

		heatLayer = L.heatLayer(points, {
			radius: options.radius,
			blur: options.blur,
			maxZoom: 18,
			max: options.maxIntensity,
			minOpacity: options.minOpacity,
			gradient: gradient
		});

		// --- 2. Contour Layer (White Lines) ---
		updateContours(options.blur);

		// Add to map if visible
		if (isVisible) {
			heatLayer.addTo(map);
			if (contourGroup) contourGroup.addTo(map);
		}
	}

	function updateContours(bandwidth: number) {
		if (contourGroup) {
			if (map.hasLayer(contourGroup)) {
				map.removeLayer(contourGroup);
			}
			contourGroup = null;
		}
		
		if (!isVisible || !points.length) return;

		// We need to generate contours based on screen coordinates
		// but render them as map-attached vectors so they stick during drag/zoom.
		// However, d3-contour works on a grid/pixels.
		// Strategy: 
		// 1. Calculate density using d3.contourDensity on current screen points.
		// 2. Convert resulting pixel paths back to LatLngs.
		// 3. Render as L.polyline or L.geoJSON.

		const size = map.getSize();
		const width = size.x;
		const height = size.y;
		
		// Project points to current container pixels
		const screenPoints: [number, number, number][] = points.map(p => {
			const pt = map.latLngToContainerPoint([p[0], p[1]]);
			return [pt.x, pt.y, p[2]] as [number, number, number]; // x, y, weight
		});

		// Generate contours
		// bandwidth corresponds to standard deviation (blur)
		const density = d3.contourDensity<[number, number, number]>()
			.x(d => d[0])
			.y(d => d[1])
			.weight(d => d[2]) // Use intensity
			.size([width, height])
			.bandwidth(bandwidth) // Match heatmap blur
			.thresholds(12) // Slightly increased thresholds for more detail
			(screenPoints);

		// Convert contours (Pixel Coords) -> GeoJSON (LatLng)
		const geoJsonFeatures = density.map(contour => {
			const coordinates = contour.coordinates.map(ring => {
				return ring.map(loop => {
					return loop.map(point => {
						// point is [x, y]
						const latLng = map.containerPointToLatLng([point[0], point[1]]);
						return [latLng.lng, latLng.lat]; // GeoJSON is [lng, lat]
					});
				});
			});

			return {
				type: "Feature",
				geometry: {
					type: "MultiPolygon",
					coordinates: coordinates
				},
				properties: {
					value: contour.value
				}
			};
		});

		// Create Leaflet GeoJSON layer
		contourGroup = L.geoJSON({
			type: "FeatureCollection",
			features: geoJsonFeatures
		}, {
			style: {
				color: 'white',
				weight: 1.5,
				opacity: 0.8,
				fill: false, // Only lines
				className: 'heatmap-contour'
			},
			interactive: false
		});
	}

	function onMoveEnd() {
		// Re-generate contours when map moves (since we calculate based on view)
		// We could optimize this by calculating for a larger area, but this is simpler.
		// Heatmap layer handles itself, but contours need recalc.
		const options = getHeatmapOptions(map.getZoom());
		updateContours(options.blur);
		if (isVisible && contourGroup && !map.hasLayer(contourGroup)) {
			contourGroup.addTo(map);
		}
	}

	function onZoomEnd() {
		createOrUpdateLayer();
	}

	// Watch for dependencies changes (map, L, points)
	$effect(() => {
		// Access reactive dependencies to track them
		if (map && L && points) {
			createOrUpdateLayer();
			
			map.on('zoomend', onZoomEnd);
			map.on('moveend', onMoveEnd); // Add moveend listener
		}

		return () => {
			if (map) {
				map.off('zoomend', onZoomEnd);
				map.off('moveend', onMoveEnd);
			}
		};
	});

	// Handle visibility toggle
	$effect(() => {
		if (map) {
			if (isVisible) {
				if (heatLayer && !map.hasLayer(heatLayer)) map.addLayer(heatLayer);
				if (contourGroup && !map.hasLayer(contourGroup)) map.addLayer(contourGroup);
			} else {
				if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
				if (contourGroup && map.hasLayer(contourGroup)) map.removeLayer(contourGroup);
			}
		}
	});

	onDestroy(() => {
		if (map) {
			if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
			if (contourGroup && map.hasLayer(contourGroup)) map.removeLayer(contourGroup);
		}
	});
</script>

