<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getLocale } from '$lib/paraglide/runtime';
	import LeafletMap from '$lib/components/LeafletMap.svelte';
	import InteractiveMap from '$lib/components/InteractiveMap.svelte';
	import MapLayerToggle from '$lib/components/MapLayerToggle.svelte';
	import NativeAdCard from '$lib/components/NativeAdCard.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import InfoHint from '$lib/components/InfoHint.svelte';
	import EnvironmentRisksCard from '$lib/components/EnvironmentRisksCard.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import { generateSEO } from '$lib/utils/seo';
	import StructuredData from '$lib/components/StructuredData.svelte';
	
	// Shadcn Components
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import Progress from "$lib/components/ui/progress/progress.svelte";
	import Separator from "$lib/components/ui/separator/separator.svelte";
	import ProgressChart from "$lib/components/charts/ProgressChart.svelte";
	import NoiseLineChart from "$lib/components/charts/NoiseLineChart.svelte";
	import SafetyRadarChart from "$lib/components/charts/SafetyRadarChart.svelte";

	// Icons
	import { 
		ArrowLeft, 
		Share2, 
		Volume2, 
		Shield, 
		Wind, 
		MapPin, 
		Bike, 
		Trash2, 
		Droplets, 
		Bus, 
		AlertCircle,
		Speaker,
		Factory,
		Bug,
		Search,
		TrainFront,
		Store,
		Building
	} from "lucide-svelte";

	// Define PointOfInterest type locally
	type PointOfInterest = {
		type: 'temple' | 'accident' | 'factory' | 'youbike' | 'transport' | 'trash';
		latitude: number;
		longitude: number;
		label: string;
		details?: string;
	};

	// Receive data from load function
	let { data }: { data: PageData } = $props();

	// Derived locale - automatically updates when locale changes
	const locale = $derived(getLocale());

	interface ScoreData {
		address: string;
		coordinates: { latitude: number; longitude: number };
		isApproximate?: boolean;
		scores: {
			overall: number;
			noise: number;
			airQuality: number;
			safety: number;
			convenience: number;
			zoningRisk: number;
		};
		detailedData?: any;
	}

	// Derived state from server data
	const scoreData = $derived(data.scoreData ?? null);
	const error = $derived(data.error ?? null);
	
	// Local UI state
	let address = $state('');
	let loading = $state(false);
	let showSuggestions = $state(false);
	let addressValidationError = $state<string | null>(null);
	let isFetchingSuggestions = $state(false);
	let mapSearchResult = $state<{ latitude: number; longitude: number; address?: string } | null>(null);
	let selectedCoordinates = $state<{ latitude: number; longitude: number } | null>(null);
	
	type AddressSuggestion = {
		displayName: string;
		address: string;
		latitude: number;
		longitude: number;
		placeId: number;
		components: {
			road?: string;
			houseNumber?: string;
			neighbourhood?: string;
			district?: string;
			city?: string;
			postcode?: string;
		};
	};
	
	let suggestions = $state<AddressSuggestion[]>([]);
	let selectedSuggestionIndex = $state(-1);
	let suggestionTimeout: ReturnType<typeof setTimeout> | null = null;
	
	// Map layer visibility states (bound to LeafletMap)
	let noiseVisible = $state(true);
	let airQualityVisible = $state(false);
	let safetyPointsVisible = $state(false);
	
	// Sync address with URL parameter when data changes
	$effect(() => {
		address = data.address ?? '';
		showSuggestions = false;
		suggestions = [];
	});

	// Cleanup timeout on component destroy (client-side only)
	if (browser) {
		$effect(() => {
			return () => {
				if (suggestionTimeout) {
					clearTimeout(suggestionTimeout);
					suggestionTimeout = null;
				}
			};
		});
	}
	
	// Derived points of interest from score data
	const pointsOfInterest = $derived(scoreData ? generatePOIs(scoreData) : []);

	function generatePOIs(data: ScoreData): PointOfInterest[] {
		const pois: PointOfInterest[] = [];
		const { latitude, longitude } = data.coordinates;
		const { detailedData } = data;

		if (!detailedData) return pois;

		// Helper to generate random point in radius
		const randomPoint = (minDist: number, maxDist: number) => {
			const r = (minDist + Math.random() * (maxDist - minDist)) / 111320; // convert meters to degrees approx
			const theta = Math.random() * 2 * Math.PI;
			return {
				lat: latitude + r * Math.cos(theta),
				lng: longitude + r * Math.sin(theta)
			};
		};

		// 1. Temples (Nuisance)
		if (detailedData.noise?.nearbyTemples) {
			for (let i = 0; i < detailedData.noise.nearbyTemples; i++) {
				const pt = randomPoint(100, 400);
				pois.push({
					type: 'temple',
					latitude: pt.lat,
					longitude: pt.lng,
					label: m.poi_temple_label(),
					details: m.poi_temple_desc()
				});
			}
		}

		// 2. Accident Hotspots (Danger)
		if (detailedData.safety?.accidentHotspots) {
			for (let i = 0; i < detailedData.safety.accidentHotspots; i++) {
				const pt = randomPoint(50, 300);
				pois.push({
					type: 'accident',
					latitude: pt.lat,
					longitude: pt.lng,
					label: m.poi_accident_label(),
					details: m.poi_accident_desc()
				});
			}
		}

		// 3. Factories (Pollution)
		if (detailedData.zoning?.adjacentIndustrial) {
			const pt = randomPoint(200, 500);
			pois.push({
				type: 'factory',
				latitude: pt.lat,
				longitude: pt.lng,
				label: m.poi_factory_label(),
				details: m.poi_factory_desc()
			});
		}

		// 4. YouBike (Amenity) - Don't show on map to avoid visual clutter
		// Only the nearest station is shown in the convenience list below

		// 5. Transport (Amenity) - Mock based on score if no count
		const transportCount = Math.ceil(detailedData.convenience?.publicTransportScore / 30) || 1;
		for (let i = 0; i < transportCount; i++) {
			const pt = randomPoint(200, 500);
			pois.push({
				type: 'transport',
				latitude: pt.lat,
				longitude: pt.lng,
				label: m.poi_transport_label(),
				details: m.poi_transport_desc()
			});
		}

		// 6. Trash Points (Amenity)
		if (detailedData.convenience?.trashCollectionPoints) {
			for (let i = 0; i < detailedData.convenience.trashCollectionPoints; i++) {
				const pt = randomPoint(100, 300);
				pois.push({
					type: 'trash',
					latitude: pt.lat,
					longitude: pt.lng,
					label: m.poi_trash_label(),
					details: m.poi_trash_desc()
				});
			}
		}

		return pois;
	}

	async function fetchSuggestions(query: string) {
		// Ensure we're in the browser before making fetch calls
		if (!browser || query.trim().length < 2) {
			suggestions = [];
			showSuggestions = false;
			isFetchingSuggestions = false;
			return;
		}

		isFetchingSuggestions = true;
		try {
			const response = await fetch(`/api/geocode/suggestions?q=${encodeURIComponent(query)}`);
			if (!response.ok) {
				suggestions = [];
				showSuggestions = false;
				return;
			}
			
			const data = await response.json();
			suggestions = data.suggestions || [];
			showSuggestions = suggestions.length > 0;
			selectedSuggestionIndex = -1;
		} catch (error) {
			console.error('Error fetching suggestions:', error);
			suggestions = [];
			showSuggestions = false;
		} finally {
			isFetchingSuggestions = false;
		}
	}

	function handleAddressInput(e: Event) {
		// Only handle input events in the browser
		if (!browser) return;
		
		const target = e.target as HTMLInputElement;
		address = target.value;
		showSuggestions = false;
		addressValidationError = null; // Clear validation error when user types
		
		// Debounce suggestions fetch
		if (suggestionTimeout) {
			clearTimeout(suggestionTimeout);
		}
		
		// Show loading indicator immediately if query is long enough
		if (address.trim().length >= 2) {
			isFetchingSuggestions = true;
		} else {
			isFetchingSuggestions = false;
			suggestions = [];
		}
		
		suggestionTimeout = setTimeout(() => {
			// Double-check browser context before fetch
			if (browser && address.trim().length >= 2) {
				fetchSuggestions(address);
			} else {
				suggestions = [];
				showSuggestions = false;
				isFetchingSuggestions = false;
			}
		}, 300);
	}

	function selectSuggestion(suggestion: AddressSuggestion) {
		address = suggestion.address;
		showSuggestions = false;
		suggestions = [];
		// Center map on suggestion location (don't search yet, wait for pin placement)
		mapSearchResult = {
			latitude: suggestion.latitude,
			longitude: suggestion.longitude,
			address: suggestion.displayName
		};
		selectedCoordinates = null; // Reset selected coordinates
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!showSuggestions || suggestions.length === 0) {
			if (e.key === 'Enter') {
				e.preventDefault();
				// If no suggestions available, validate before searching
				searchAddress();
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
					selectSuggestion(suggestions[selectedSuggestionIndex]);
				} else {
					// If user typed Enter but didn't select, validate first
					searchAddress();
				}
				break;
			case 'Escape':
				showSuggestions = false;
				break;
		}
	}

	async function validateAddress(addressToValidate: string): Promise<boolean> {
		if (!browser) return false;
		
		try {
			// Try to get suggestions - if we get any results (even street/district level), it's valid
			const response = await fetch(`/api/geocode/suggestions?q=${encodeURIComponent(addressToValidate)}&limit=1`);
			if (!response.ok) return false;
			
			const data = await response.json();
			// Accept any result - even street/district level is acceptable for our use case
			return (data.suggestions || []).length > 0;
		} catch (error) {
			console.error('Error validating address:', error);
			return false;
		}
	}

	async function searchAddress(queryAddress?: string) {
		if (!browser) return;
		
		const targetAddress = queryAddress || address;
		if (!targetAddress.trim()) {
			addressValidationError = m.error_please_enter_address();
			return;
		}

		// Hide suggestions when searching
		showSuggestions = false;
		addressValidationError = null;
		loading = true;

		// Validate address before searching - block if Nominatim can't find it
		if (!queryAddress && suggestions.length === 0) {
			const isValid = await validateAddress(targetAddress);
			if (!isValid) {
				addressValidationError = m.error_address_not_found_suggestions();
				loading = false;
				return;
			}
		}

		// If we have suggestions but user didn't select one, check if typed address matches
		if (!queryAddress && suggestions.length > 0) {
			const exactMatch = suggestions.find((s: AddressSuggestion) => 
				s.address.toLowerCase() === targetAddress.toLowerCase() ||
				s.displayName.toLowerCase() === targetAddress.toLowerCase()
			);
			
			if (!exactMatch) {
				// User typed something different, validate it
				const isValid = await validateAddress(targetAddress);
				if (!isValid) {
					addressValidationError = m.error_address_not_found();
					loading = false;
					return;
				}
			}
		}

		// Instead of navigating immediately, geocode the address and center the map
		try {
			const response = await fetch(`/api/geocode/suggestions?q=${encodeURIComponent(targetAddress)}&limit=1`);
			if (response.ok) {
				const data = await response.json();
				if (data.suggestions && data.suggestions.length > 0) {
					const suggestion = data.suggestions[0];
					mapSearchResult = {
						latitude: suggestion.latitude,
						longitude: suggestion.longitude,
						address: suggestion.displayName
					};
					selectedCoordinates = null; // Reset selected coordinates
					loading = false;
					return;
				}
			}
		} catch (err) {
			console.error('Geocoding error:', err);
		}

		// Fallback: navigate with address (old behavior)
		try {
			await goto(`?address=${encodeURIComponent(targetAddress)}`, {
				noScroll: false,
				keepFocus: false,
				invalidateAll: true
			});
		} catch (err) {
			console.error('Navigation error:', err);
			addressValidationError = m.error_search_failed();
		} finally {
			loading = false;
		}
	}

	async function handlePinPlaced(coordinates: { latitude: number; longitude: number }) {
		if (!browser) return;
		
		selectedCoordinates = coordinates;
		loading = true;
		
		try {
			// Reverse geocode to get address from coordinates
			const response = await fetch(`/api/score/recalculate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(coordinates)
			});
			
			if (!response.ok) {
				throw new Error('Failed to calculate score');
			}
			
			const scoreData = await response.json();
			
			// Reverse geocode to get address
			const reverseResponse = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&addressdetails=1`,
				{
					headers: { 'User-Agent': 'TranquilTaiwan/1.0' }
				}
			);
			
			let addressFromCoords = `Lat: ${coordinates.latitude.toFixed(6)}, Lon: ${coordinates.longitude.toFixed(6)}`;
			if (reverseResponse.ok) {
				const reverseData = await reverseResponse.json();
				addressFromCoords = reverseData.display_name || addressFromCoords;
			}
			
			// Navigate with coordinates
			await goto(`?lat=${coordinates.latitude}&lon=${coordinates.longitude}&address=${encodeURIComponent(addressFromCoords)}`, {
				noScroll: false,
				keepFocus: false,
				invalidateAll: true
			});
		} catch (error) {
			console.error('Error calculating score:', error);
			addressValidationError = m.error_calculate_failed();
			loading = false;
		}
	}

	// Derived utility functions
	const getScoreColor = (score: number): string => {
		if (score >= 80) return 'text-[#34C759]'; // System Green
		if (score >= 60) return 'text-[#FFCC00]'; // System Yellow
		return 'text-[#FF3B30]'; // System Red
	};
	
	const getScoreLabel = (score: number): string => {
		if (score >= 80) return m.score_excellent();
		if (score >= 60) return m.score_good();
		if (score >= 40) return m.score_fair();
		return m.score_poor();
	};

	// Truncate address with ellipsis
	const truncateAddress = (address: string, maxLength: number = 60): string => {
		if (!address || address.length <= maxLength) return address;
		return address.substring(0, maxLength).trim() + '...';
	};

	const getTeaserSummary = (data: ScoreData): string => {
		const noiseLevel = 
			data.scores.noise >= 80 ? m.teaser_noise_status_quiet() :
			data.scores.noise < 60 ? m.teaser_noise_status_noisy() :
			m.teaser_noise_status_moderate();

		// Find the lowest score among other categories to highlight as concern
		const concerns = [
			{ score: data.scores.airQuality, name: m.teaser_concern_air() },
			{ score: data.scores.safety, name: m.teaser_concern_safety() },
			{ score: data.scores.convenience, name: m.teaser_concern_convenience() }
		];
		
		concerns.sort((a, b) => a.score - b.score);
		const concern = concerns[0].score < 70 ? concerns[0].name : m.teaser_concern_none();

		return m.teaser_summary({ noiseLevel, concern });
	};

	// Format YouBike station name by removing "YouBike2.0_" prefix
	const formatYouBikeName = (name: string | undefined | null): string => {
		if (!name) return m.poi_youbike_label();
		// Remove "YouBike2.0_" or "YouBike2.0" prefix if present
		return name.replace(/^YouBike2\.0[_]?/i, '').trim() || m.poi_youbike_label();
	};

	async function shareResult() {
		if (!browser || !scoreData) return;
		
		// Try native share API first (mobile)
		if (navigator.share) {
			try {
				await navigator.share({
					title: `${scoreData.address} - ${m.livability_score()}`,
					text: `${m.livability_score()}: ${Math.round(scoreData.scores.overall)}/100`,
					url: shareUrl
				});
				return;
			} catch (err) {
				// User cancelled or error occurred - fall through to clipboard
			}
		}
		
		// Fallback: copy to clipboard
		try {
			await navigator.clipboard.writeText(shareUrl);
			alert(m.share_copied());
		} catch (err) {
			// Final fallback: show URL in prompt
			prompt(m.share_copy_link(), shareUrl);
		}
	}


	// Derived values for meta tags
	const shareUrl = $derived(
		scoreData 
			? `${page.url.origin}${page.url.pathname === '/' ? '' : page.url.pathname}?address=${encodeURIComponent(scoreData.address)}&share=true`
			: ''
	);

	const metaDescription = $derived(
		scoreData
			? `${scoreData.address} - ${m.livability_score()}: ${Math.round(scoreData.scores.overall)}/100. ${getTeaserSummary(scoreData)}`
			: m.landing_subtitle()
	);

	// Generate SEO data
	const seoData = $derived(
		scoreData
			? generateSEO(
					{
						title: `${scoreData.address} - ${m.livability_score()}: ${Math.round(scoreData.scores.overall)}/100`,
						description: metaDescription,
						image: `${page.url.origin}/logo.png`,
						url: shareUrl
					},
					page
				)
			: generateSEO(
					{
						title: m.landing_title(),
						description: m.landing_subtitle(),
						image: `${page.url.origin}/logo.png`
					},
					page
				)
	);
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{m.app_title()} - {seoData.title}</title>
	<meta name="title" content="{seoData.title}" />
	<meta name="description" content={seoData.description} />
	<link rel="canonical" href={seoData.canonical} />
	<meta name="robots" content={seoData.robots} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={seoData.og.type} />
	<meta property="og:url" content={seoData.og.url} />
	<meta property="og:title" content={seoData.og.title} />
	<meta property="og:description" content={seoData.og.description} />
	<meta property="og:image" content={seoData.og.image} />
	<meta property="og:site_name" content={seoData.og.siteName} />

	<!-- Twitter -->
	<meta name="twitter:card" content={seoData.twitter.card} />
	<meta name="twitter:url" content={seoData.og.url} />
	<meta name="twitter:title" content={seoData.twitter.title} />
	<meta name="twitter:description" content={seoData.twitter.description} />
	<meta name="twitter:image" content={seoData.twitter.image} />

	<!-- LINE -->
	<meta property="line:image" content={seoData.line.image} />
	<meta property="line:description" content={seoData.line.description} />
</svelte:head>

<!-- Structured Data (JSON-LD) for SEO -->
<StructuredData 
	seoData={{
		title: seoData.title,
		description: seoData.description,
		image: seoData.og.image
	}}
	type={scoreData ? 'WebPage' : 'WebSite'}
	url={seoData.canonical}
/>

{#if !scoreData}
	<!-- Landing Page Layout -->
	<div class="min-h-screen flex flex-col bg-[#FAFAFA] relative font-sans text-[#1D1D1F]">
		<!-- Header -->
		<header class="flex justify-between items-center px-6 py-4 absolute top-0 w-full z-10">
			<div class="flex items-center gap-2">
				<img src="/logo.png" alt="TranquilTaiwan" class="w-8 h-8 object-contain" />
				<span class="font-bold text-lg text-[#1D1D1F] tracking-tight">TranquilTaiwan</span>
			</div>
			<!-- Login removed, Language Switcher added -->
			<LanguageSwitcher />
		</header>

		<!-- Hero Section -->
		<main class="flex-grow flex flex-col items-center justify-start px-4 w-full max-w-6xl mx-auto pt-24 pb-10">
			<div class="text-center mb-12 space-y-4">
				<h1 class="text-4xl md:text-5xl font-bold text-[#1D1D1F] leading-tight tracking-tight">
					{m.hero_title_prefix()} <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#007AFF] to-[#5856D6]">{m.hero_title_suffix()}</span>
				</h1>
				<p class="text-[19px] leading-relaxed text-[#86868B] font-light max-w-2xl mx-auto">
					{m.landing_subtitle()}
				</p>
			</div>

			<!-- Map Layout -->
			<div class="w-full mb-8">
				<!-- Interactive Map -->
				<div class="w-full h-[500px] lg:h-[600px] rounded-[18px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.08)] relative">
					<InteractiveMap
						onPinPlaced={handlePinPlaced}
						searchResult={mapSearchResult}
					/>
					<div class="absolute bottom-4 left-4 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded-[12px] px-4 py-2 text-sm text-[#86868B] border border-[rgba(0,0,0,0.08)]">
						<p class="font-medium text-[#1D1D1F] mb-1">{m.map_instructions_title()}</p>
						<p class="text-xs">{m.map_instructions_step1()}</p>
						<p class="text-xs">{m.map_instructions_step2()}</p>
						<p class="text-xs">{m.map_instructions_step3()}</p>
					</div>
				</div>
			</div>

			
			{#if error}
				<div class="mt-6 w-full animate-fade-in max-w-6xl mx-auto px-4">
					<div class="bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] px-4 py-3 rounded-[14px] flex items-start gap-3 backdrop-blur-md">
						<AlertCircle class="stroke-current shrink-0 h-5 w-5 mt-0.5" strokeWidth={1.5} />
						<span>{error}</span>
					</div>
				</div>
			{/if}
		</main>

		<!-- Footer -->
		<footer class="py-8 text-center text-[13px] text-[#86868B] space-x-6">
			<a href="/about" class="hover:text-[#1D1D1F] transition-colors">{m.landing_footer_about()}</a>
			<a href="/sources" class="hover:text-[#1D1D1F] transition-colors">{m.landing_footer_sources()}</a>
			<a href="/legal" class="hover:text-[#1D1D1F] transition-colors">{m.landing_footer_legal()}</a>
		</footer>
	</div>
{:else}
	<!-- Detailed Report View (Immersive Design) -->
	<div class="min-h-screen bg-[#FAFAFA] relative pb-32 font-sans text-[#1D1D1F]">
		
		<!-- 1. Map Background (Hero) -->
		<div class="absolute top-0 left-0 w-full h-[60vh] md:h-[65vh] z-0">
			<LeafletMap
				latitude={scoreData.coordinates.latitude}
				longitude={scoreData.coordinates.longitude}
				address={scoreData.address}
				noiseScore={scoreData.scores.noise}
				airQualityScore={scoreData.scores.airQuality}
				zoom={15}
				detailedData={scoreData.detailedData}
				pointsOfInterest={pointsOfInterest}
				bind:noiseVisible
				bind:airQualityVisible
				bind:safetyPointsVisible
			/>
			<!-- Gradient Overlay -->
			<div class="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent z-10 pointer-events-none"></div>
			
			<!-- MapLayerToggle - Moved inside map container but with high z-index and absolute positioning -->
			<MapLayerToggle
				{noiseVisible}
				{airQualityVisible}
				{safetyPointsVisible}
				onNoiseChange={(visible: boolean) => noiseVisible = visible}
				onAirQualityChange={(visible: boolean) => airQualityVisible = visible}
				onSafetyPointsChange={(visible: boolean) => safetyPointsVisible = visible}
			/>

			<!-- Floating Score Card (Absolute over map) -->
			<div class="absolute -bottom-20 left-4 right-4 z-20 max-w-4xl mx-auto">
				<Card.Root class="rounded-[24px] border border-white/40 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] backdrop-blur-[40px] bg-[rgba(255,255,255,0.85)]">
					<Card.Header class="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-6">
						<div class="space-y-2 flex-1 min-w-0">
							<Card.Title class="text-[28px] leading-[1.1] md:text-[34px] font-bold text-[#1D1D1F] tracking-tight truncate" title={scoreData.address}>{truncateAddress(scoreData.address, 60)}</Card.Title>
							<div class="flex items-center gap-2 text-[#007AFF] font-medium text-[17px]">
								<MapPin class="w-4 h-4" strokeWidth={2} />
								<span>{m.report_env_title()} - {getScoreLabel(scoreData.scores.overall)}</span>
							</div>
						</div>
						
						<div class="flex items-center gap-4 bg-[rgba(255,255,255,0.5)] p-2 rounded-[20px] border border-[rgba(0,0,0,0.04)] backdrop-blur-md">
							<div class="flex flex-col items-end">
								<span class="text-[11px] text-[#86868B] uppercase font-bold tracking-widest mb-1">{m.livability_score()}</span>
								<Badge variant={scoreData.scores.overall >= 80 ? 'default' : scoreData.scores.overall >= 60 ? 'warning' : 'destructive'} class="text-[13px] h-6 px-2.5">
									{getScoreLabel(scoreData.scores.overall)}
								</Badge>
							</div>
							<div class="relative flex items-center justify-center w-[60px] h-[60px] rounded-full bg-white shadow-sm border-[4px] {scoreData.scores.overall >= 80 ? 'border-[#34C759]/20' : scoreData.scores.overall >= 60 ? 'border-[#FFCC00]/20' : 'border-[#FF3B30]/20'}">
								<span class="text-[22px] font-bold {getScoreColor(scoreData.scores.overall)}">
									{Math.round(scoreData.scores.overall)}
								</span>
							</div>
						</div>
					</Card.Header>
				</Card.Root>
			</div>
		</div>

		<!-- 2. Header (Transparent) -->
		<header class="fixed top-0 left-0 w-full z-50 p-4 flex justify-between items-center pointer-events-none">
			<div class="pointer-events-auto flex items-center gap-3">
				<Button 
					variant="outline" 
					size="icon" 
					class="bg-[rgba(255,255,255,0.72)] backdrop-blur-xl shadow-sm hover:bg-[rgba(255,255,255,0.9)] rounded-full border border-[rgba(0,0,0,0.05)] w-[40px] h-[40px]"
					onclick={() => goto('/')}
					aria-label={m.teaser_back()}
				>
					<ArrowLeft class="w-5 h-5 text-[#1D1D1F]" strokeWidth={2} />
				</Button>
				<a href="/" class="flex items-center gap-2">
					<img src="/logo.png" alt="TranquilTaiwan" class="w-8 h-8 object-contain" />
				</a>
			</div>
			<div class="pointer-events-auto">
				<LanguageSwitcher />
			</div>
		</header>

		<!-- 3. Spacer -->
		<div class="h-[60vh] md:h-[65vh] w-full pointer-events-none"></div>

		<!-- 4. Content Container -->
		<div class="relative z-20 px-4 max-w-4xl mx-auto space-y-8 mt-24">
			
			<!-- Native Ad (Partenaire) - Temporairement masqué -->
			<!--
			<NativeAdCard 
				title={m.mock_ad_1_title()}
				description={m.mock_ad_1_desc()}
				image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" 
			/>
			-->

			<!-- Data Cards Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
				
				<!-- Noise Section -->
				<Card.Root class="h-full mb-6 md:mb-0">
					<Card.Header class="pb-4 relative">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-full bg-[rgba(255,149,0,0.1)] text-[#FF9500] flex items-center justify-center">
									<Volume2 class="w-5 h-5" strokeWidth={1.5} />
								</div>
								<Card.Title>{m.report_noise_title()}</Card.Title>
							</div>
							<Badge variant="outline" class="font-semibold text-sm bg-white/50 border-[rgba(0,0,0,0.08)]">
								{Math.round(scoreData.detailedData?.noise?.level || 0)} dB
							</Badge>
						</div>
						<div class="absolute top-6 right-6">
							<InfoHint 
								title={m.info_noise_title()}
								description={m.info_noise_desc()}
							/>
						</div>
					</Card.Header>
					
					<Card.Content>
						{#if scoreData.detailedData?.noise}
							{@const noiseData = scoreData.detailedData.noise}
							<div class="mb-6 space-y-3">
								<div class="flex justify-between items-center">
									<span class="text-[11px] font-semibold text-[#86868B] uppercase tracking-wide">
										{m.report_noise_title()}
									</span>
									<span class="{noiseData.level >= 60 ? 'text-[#FF3B30]' : 'text-[#34C759]'} font-bold text-sm">
										{noiseData.level >= 80 ? m.teaser_noise_status_noisy() : noiseData.level >= 60 ? m.teaser_noise_status_moderate() : m.teaser_noise_status_quiet()}
									</span>
								</div>
								
								<!-- Chart.js Line Chart -->
								<NoiseLineChart noiseLevel={noiseData.level} />
							</div>

							<div class="space-y-3">
								{#if noiseData.nearbyTemples > 0}
									<div class="flex items-center gap-3 p-3 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-[#F5F5F7]/50">
										<div class="p-2 rounded-full bg-white text-[#FF9500] shadow-sm">
											<Speaker class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<div class="flex-1">
											<p class="text-[15px] font-medium text-[#1D1D1F]">{m.poi_temple_label()}</p>
											<p class="text-[13px] text-[#86868B]">
												{m.report_noise_item_temple({ 
													distance: noiseData.nearbyTemples, 
													risk: noiseData.nearbyTemples > 1 ? m.risk_high() : m.risk_low() 
												})}
											</p>
										</div>
									</div>
								{/if}
								{#if noiseData.majorRoads > 0}
									<div class="flex items-center gap-3 p-3 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-[#F5F5F7]/50">
										<div class="p-2 rounded-full bg-white text-[#FF9500] shadow-sm">
											<Bus class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<div class="flex-1">
											<p class="text-[15px] font-medium text-[#1D1D1F]">{m.report_noise_item_road({ distance: 0, risk: '' }).split(':')[0]}</p>
											<p class="text-[13px] text-[#86868B]">
												{m.report_noise_item_road({ 
													distance: noiseData.majorRoads * 200, 
													risk: noiseData.majorRoads > 1 ? m.risk_high() : m.risk_low() 
												})}
											</p>
										</div>
									</div>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-[#86868B]">{m.status_unknown()}</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Environment & Risks Section -->
				<EnvironmentRisksCard detailedData={scoreData.detailedData} />

				<!-- Safety Section -->
				<Card.Root class="h-full mb-6 md:mb-0">
					<Card.Header class="pb-4 relative">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full bg-[rgba(255,149,0,0.1)] text-[#FF9500] flex items-center justify-center">
								<Shield class="w-5 h-5" strokeWidth={1.5} />
							</div>
							<Card.Title>{m.report_safety_title()}</Card.Title>
						</div>
					</Card.Header>

					<Card.Content>
						{#if scoreData.detailedData?.safety}
							{@const safetyData = scoreData.detailedData.safety}
							<div class="mb-6 space-y-4">
								<!-- Chart.js Radar Chart -->
								<SafetyRadarChart safetyData={safetyData} />
								
								<div class="flex items-center gap-2 text-xs text-[#86868B] bg-[#F5F5F7] p-3 rounded-[14px] border border-[rgba(0,0,0,0.06)]">
									<AlertCircle class="w-4 h-4 text-[#86868B]" strokeWidth={1.5} />
									<span>{m.report_safety_stats({ crimeRate: (safetyData.crimeRate * 100).toFixed(1), hotspots: safetyData.accidentHotspots })}</span>
								</div>
							</div>

							{#if safetyData.accidentHotspots > 0}
								<div class="flex items-center gap-3 p-3 rounded-[14px] border border-[rgba(0,0,0,0.06)] bg-[#F5F5F7]/50">
									<div class="p-2 rounded-full bg-white text-[#FF3B30] shadow-sm">
										<AlertCircle class="w-4 h-4" strokeWidth={1.5} />
									</div>
									<div class="flex-1">
										<p class="text-[15px] font-medium text-[#1D1D1F]">{m.poi_accident_label()}</p>
										<p class="text-[13px] text-[#86868B]">
											{m.report_safety_accident({ time: `${safetyData.accidentHotspots} hotspot${safetyData.accidentHotspots > 1 ? 's' : ''} nearby` })}
										</p>
									</div>
								</div>
							{/if}
						{:else}
							<p class="text-sm text-[#86868B]">{m.status_unknown()}</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Convenience Section (Walkability List) -->
				{#if scoreData.detailedData?.convenience}
					{@const convenienceData = scoreData.detailedData.convenience}
					{@const walkScore = Math.min(100, Math.round(convenienceData.publicTransportScore * 0.4 + (convenienceData.youbikeStations > 0 ? 30 : 0) + (convenienceData.trashCollectionPoints > 0 ? 20 : 0) + 10))}
					{@const walkScoreLabel = walkScore >= 90 ? m.walk_paradise() : walkScore >= 70 ? m.walk_very() : walkScore >= 50 ? m.walk_somewhat() : m.walk_car()}
					<Card.Root class="h-full mb-6 md:mb-0">
						<Card.Header class="pb-4 relative">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full bg-[rgba(175,82,222,0.1)] text-[#AF52DE] flex items-center justify-center">
										<Bike class="w-5 h-5" strokeWidth={1.5} />
									</div>
									<Card.Title>{m.convenience()}</Card.Title>
								</div>
							</div>
							
							<!-- Walk Score -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-semibold text-[#1D1D1F]">{m.walk_score()}</p>
										<p class="text-xs text-[#86868B]">{walkScoreLabel}</p>
									</div>
									<div class="text-right">
										<span class="text-2xl font-bold text-[#34C759]">{walkScore}</span>
										<span class="text-sm text-[#86868B]">/100</span>
									</div>
								</div>
								<Progress value={walkScore} class="h-1.5" />
							</div>
						</Card.Header>
						
						<Card.Content class="space-y-4">
							<!-- Transport: Daan Park Station -->
							<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#5856D6]">
										<TrainFront size={18} strokeWidth={1.5} />
									</div>
									<div>
										<p class="font-medium text-[#1D1D1F]">{m.mock_transport_station()}</p>
										<p class="text-xs text-[#86868B]">{m.mock_transport_desc()}</p>
									</div>
								</div>
								<div class="text-right">
									<Badge variant="secondary" class="bg-[#F5F5F7] text-[#1D1D1F]">4 min</Badge>
									<p class="text-[10px] text-[#86868B] mt-1">350m</p>
								</div>
							</div>

							<!-- Daily Life: 7-Eleven -->
							<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#34C759]">
										<Store size={18} strokeWidth={1.5} />
									</div>
									<div>
										<p class="font-medium text-[#1D1D1F]">{m.mock_store_name()}</p>
										<p class="text-xs text-[#86868B]">{m.mock_store_desc()}</p>
									</div>
								</div>
								<div class="text-right">
									<Badge variant="secondary" class="bg-[#F5F5F7] text-[#1D1D1F]">1 min</Badge>
									<p class="text-[10px] text-[#86868B] mt-1">80m</p>
								</div>
							</div>

							<!-- Bike: YouBike Station (Nearest Only) -->
							{#if convenienceData.nearestYoubikeName && convenienceData.nearestYoubikeDistance !== undefined}
								<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
									<div class="flex items-center gap-3">
										<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#34C759]">
											<Bike size={18} strokeWidth={1.5} />
										</div>
										<div>
											<p class="font-medium text-[#1D1D1F]">
												{formatYouBikeName(convenienceData.nearestYoubikeName)}
											</p>
										</div>
									</div>
									<div class="text-right">
										<Badge variant="secondary" class="bg-[#F5F5F7] text-[#1D1D1F]">
											{Math.ceil((convenienceData.nearestYoubikeDistance || 150) / 80)} min
										</Badge>
										<p class="text-[10px] text-[#86868B] mt-1">{convenienceData.nearestYoubikeDistance}m</p>
									</div>
								</div>
							{/if}

							<!-- Trash: Evening Pickup Spot -->
							{#if convenienceData.trashCollectionPoints > 0}
								<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
									<div class="flex items-center gap-3">
										<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#FF9500]">
											<Trash2 size={18} strokeWidth={1.5} />
										</div>
										<div>
											<p class="font-medium text-[#1D1D1F]">{m.poi_trash_desc()}</p>
											<p class="text-xs text-[#86868B]">{m.mock_trash_desc()}</p>
										</div>
									</div>
									<div class="text-right">
										<Badge variant="secondary" class="bg-[#F5F5F7] text-[#1D1D1F]">0 min</Badge>
										<p class="text-[10px] text-[#86868B] mt-1">{m.mock_trash_onsite()}</p>
									</div>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Bottom Ad Placeholder - Temporairement masqué -->
			<!--
			<div class="px-4 py-4 max-w-2xl mx-auto">
				<NativeAdCard 
					title={m.mock_ad_2_title()}
					description={m.mock_ad_2_desc()}
					image="https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" 
				/>
			</div>
			-->
		</div>
		
		<!-- Floating Action Bar -->
		<div class="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
			<div class="bg-[rgba(255,255,255,0.88)] backdrop-blur-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.08)] border border-[rgba(0,0,0,0.05)] rounded-full p-2 pl-6 flex items-center justify-between pointer-events-auto max-w-lg mx-auto gap-4">
				<div class="flex items-center gap-3">
					<div class="text-[15px] font-medium text-[#1D1D1F]">
						{m.report_like_prompt()}
					</div>
				</div>
				<!-- Secondary Action: Share -->
				<Button 
					variant="ghost" 
					size="icon"
					onclick={shareResult}
					class="text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors h-10 w-10 rounded-full" 
					aria-label={m.report_share_button()}
				>
					<Share2 class="w-5 h-5" strokeWidth={2} />
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.leaflet-container) {
		font-family: inherit;
		background: #FAFAFA;
	}
	
	/* Animation utilities */
	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in-up {
		animation: fadeInUp 0.5s ease-out forwards;
	}
</style>
