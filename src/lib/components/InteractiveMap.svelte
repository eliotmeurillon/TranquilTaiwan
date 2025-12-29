<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		onPinPlaced: (coordinates: { latitude: number; longitude: number }) => void;
		initialLatitude?: number;
		initialLongitude?: number;
		initialZoom?: number;
		searchResult?: { latitude: number; longitude: number; address?: string } | null;
	}

	let {
		onPinPlaced,
		initialLatitude = 25.033,
		initialLongitude = 121.5654,
		initialZoom = 13,
		searchResult = null
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = $state(null);
	let L: any = $state(null);
	let marker: any = $state(null);
	let circle: any = $state(null);

	onMount(async () => {
		if (!browser) return;

		// Dynamic import of Leaflet
		const leaflet = await import('leaflet');
		L = leaflet.default;
		await import('leaflet/dist/leaflet.css');

		// Initialize map
		map = L.map(mapContainer, {
			center: [initialLatitude, initialLongitude],
			zoom: initialZoom,
			zoomControl: true
		});

		// Add tile layer
		L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
			maxZoom: 20
		}).addTo(map);

		// Create marker icon (pin)
		const pinIcon = L.divIcon({
			className: 'bg-transparent border-0',
			html: `
				<div class="w-full h-full bg-[#007AFF] text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white cursor-pointer">
					<div class="w-4 h-4">
						<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
						</svg>
					</div>
				</div>
			`,
			iconSize: [40, 40],
			iconAnchor: [20, 40],
			popupAnchor: [0, -40]
		});

		// Handle map click to place pin
		map.on('click', (e: any) => {
			const { lat, lng } = e.latlng;

			// Remove existing marker if any
			if (marker) {
				map.removeLayer(marker);
			}
			if (circle) {
				map.removeLayer(circle);
			}

			// Place new marker
			marker = L.marker([lat, lng], { icon: pinIcon, draggable: true })
				.addTo(map)
				.bindPopup('Cliquez pour rechercher à cet emplacement')
				.openPopup();

			// Add circle to show search radius
			circle = L.circle([lat, lng], {
				color: '#007AFF',
				fillColor: '#007AFF',
				fillOpacity: 0.1,
				weight: 2,
				radius: 100 // 100m radius
			}).addTo(map);

			// Handle marker drag
			marker.on('dragend', (e: any) => {
				const newPos = e.target.getLatLng();
				if (circle) {
					circle.setLatLng(newPos);
				}
				onPinPlaced({ latitude: newPos.lat, longitude: newPos.lng });
			});

			// Call callback when pin is placed
			onPinPlaced({ latitude: lat, longitude: lng });
		});

		// Update map if search result changes
		if (searchResult) {
			map.setView([searchResult.latitude, searchResult.longitude], 15);
			
			// Remove existing marker
			if (marker) {
				map.removeLayer(marker);
			}
			if (circle) {
				map.removeLayer(circle);
			}

			// Place marker at search result
			marker = L.marker([searchResult.latitude, searchResult.longitude], { icon: pinIcon, draggable: true })
				.addTo(map)
				.bindPopup(searchResult.address || 'Ajustez le pin si nécessaire')
				.openPopup();

			circle = L.circle([searchResult.latitude, searchResult.longitude], {
				color: '#007AFF',
				fillColor: '#007AFF',
				fillOpacity: 0.1,
				weight: 2,
				radius: 100
			}).addTo(map);

			// Handle marker drag
			marker.on('dragend', (e: any) => {
				const newPos = e.target.getLatLng();
				if (circle) {
					circle.setLatLng(newPos);
				}
				onPinPlaced({ latitude: newPos.lat, longitude: newPos.lng });
			});
		}

		return () => {
			if (map) {
				map.remove();
			}
		};
	});

	// React to searchResult changes
	$effect(() => {
		if (!map || !searchResult) return;

		map.setView([searchResult.latitude, searchResult.longitude], 15);

		// Remove existing marker
		if (marker) {
			map.removeLayer(marker);
		}
		if (circle) {
			map.removeLayer(circle);
		}

		// Create pin icon
		const pinIcon = L.divIcon({
			className: 'bg-transparent border-0',
			html: `
				<div class="w-full h-full bg-[#007AFF] text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white cursor-pointer">
					<div class="w-4 h-4">
						<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
						</svg>
					</div>
				</div>
			`,
			iconSize: [40, 40],
			iconAnchor: [20, 40],
			popupAnchor: [0, -40]
		});

		// Place marker at search result
		marker = L.marker([searchResult.latitude, searchResult.longitude], { icon: pinIcon, draggable: true })
			.addTo(map)
			.bindPopup(searchResult.address || 'Ajustez le pin si nécessaire')
			.openPopup();

		circle = L.circle([searchResult.latitude, searchResult.longitude], {
			color: '#007AFF',
			fillColor: '#007AFF',
			fillOpacity: 0.1,
			weight: 2,
			radius: 100
		}).addTo(map);

		// Handle marker drag
		marker.on('dragend', (e: any) => {
			const newPos = e.target.getLatLng();
			if (circle) {
				circle.setLatLng(newPos);
			}
			onPinPlaced({ latitude: newPos.lat, longitude: newPos.lng });
		});
	});
</script>

<div bind:this={mapContainer} class="w-full h-full rounded-[18px] overflow-hidden"></div>


