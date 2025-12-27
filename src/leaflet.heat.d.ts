declare module 'leaflet.heat' {
	import * as L from 'leaflet';

	interface HeatLayerOptions {
		radius?: number;
		blur?: number;
		maxZoom?: number;
		max?: number;
		minOpacity?: number;
		gradient?: Record<string, string>;
	}

	type HeatLatLng = [number, number, number]; // [lat, lng, intensity]

	// Extend Leaflet namespace
	declare module 'leaflet' {
		class HeatLayer extends L.Layer {
			constructor(latlngs: HeatLatLng[], options?: HeatLayerOptions);
			setLatLngs(latlngs: HeatLatLng[]): this;
			addLatLng(latlng: HeatLatLng): this;
			setOptions(options: HeatLayerOptions): this;
		}

		namespace HeatLayer {
			function heatLayer(
				latlngs: HeatLatLng[],
				options?: HeatLayerOptions
			): HeatLayer;
		}
	}

	// This module extends Leaflet, so we just need to import it
	// The import side-effect extends the L namespace
}

