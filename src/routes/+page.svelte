<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getLocale } from '$lib/paraglide/runtime';
	import LeafletMap from '$lib/components/LeafletMap.svelte';
	import MapLayerToggle from '$lib/components/MapLayerToggle.svelte';
	import NativeAdCard from '$lib/components/NativeAdCard.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import InfoHint from '$lib/components/InfoHint.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	
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
		Leaf, 
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
	
	// Map layer visibility states (bound to LeafletMap)
	let noiseVisible = $state(true);
	let airQualityVisible = $state(false);
	let safetyPointsVisible = $state(false);
	
	// Sync address with URL parameter when data changes
	$effect(() => {
		address = data.address ?? '';
	});
	
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
					label: 'Local Temple',
					details: 'Risk: High Noise (Festivals)'
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
					label: 'Accident Blackspot',
					details: 'High Collision Rate'
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
				label: 'Industrial Zone',
				details: 'Potential Air/Noise Issues'
			});
		}

		// 4. YouBike (Amenity)
		if (detailedData.convenience?.youbikeStations) {
			for (let i = 0; i < detailedData.convenience.youbikeStations; i++) {
				const pt = randomPoint(100, 450);
				pois.push({
					type: 'youbike',
					latitude: pt.lat,
					longitude: pt.lng,
					label: 'YouBike Station',
					details: `${Math.floor(Math.random() * 20)} bikes available`
				});
			}
		}

		// 5. Transport (Amenity) - Mock based on score if no count
		const transportCount = Math.ceil(detailedData.convenience?.publicTransportScore / 30) || 1;
		for (let i = 0; i < transportCount; i++) {
			const pt = randomPoint(200, 500);
			pois.push({
				type: 'transport',
				latitude: pt.lat,
				longitude: pt.lng,
				label: 'Bus/MRT Station',
				details: 'Public Transit Access'
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
					label: 'Trash Collection',
					details: 'Evening Collection Point'
				});
			}
		}

		return pois;
	}

	async function searchAddress(queryAddress?: string) {
		if (!browser) return;
		
		const targetAddress = queryAddress || address;
		if (!targetAddress.trim()) {
			// Error will be shown via data.error from server
			return;
		}

		loading = true;

		try {
			await goto(`/?address=${encodeURIComponent(targetAddress)}`, {
				noScroll: false,
				keepFocus: false,
				invalidateAll: true
			});
		} catch (err) {
			// Navigation error - will be handled by error state
			console.error('Navigation error:', err);
		} finally {
			// Reset loading after navigation completes
			loading = false;
		}
	}


	// Derived utility functions
	const getScoreColor = (score: number): string => {
		if (score >= 80) return 'text-emerald-700';
		if (score >= 60) return 'text-yellow-600';
		return 'text-orange-600';
	};
	
	const getScoreLabel = (score: number): string => {
		if (score >= 80) return m.score_excellent();
		if (score >= 60) return m.score_good();
		if (score >= 40) return m.score_fair();
		return m.score_poor();
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
			? `${page.url.origin}${page.url.pathname}?address=${encodeURIComponent(scoreData.address)}&share=true`
			: ''
	);

	const metaDescription = $derived(
		scoreData
			? `${scoreData.address} - ${m.livability_score()}: ${Math.round(scoreData.scores.overall)}/100. ${getTeaserSummary(scoreData)}`
			: m.landing_subtitle()
	);

	const baseUrl = $derived(page.url.origin);
</script>

<svelte:head>
	{#if scoreData}
		<!-- Open Graph / LINE meta tags for sharing -->
		<meta property="og:title" content="{scoreData.address} - {m.livability_score()}: {Math.round(scoreData.scores.overall)}/100" />
		<meta property="og:description" content={metaDescription} />
		<meta property="og:url" content={shareUrl} />
		<meta property="og:image" content="{baseUrl}/og-image.png" />
		<meta property="og:type" content="website" />
		<!-- LINE specific meta tags -->
		<meta property="line:image" content="{baseUrl}/og-image.png" />
		<meta property="line:description" content={metaDescription} />
		<!-- Twitter Card -->
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content="{scoreData.address} - {m.livability_score()}" />
		<meta name="twitter:description" content={metaDescription} />
		<meta name="twitter:image" content="{baseUrl}/og-image.png" />
	{:else}
		<!-- Default meta tags for landing page -->
		<meta property="og:title" content={m.landing_title()} />
		<meta property="og:description" content={m.landing_subtitle()} />
		<meta property="og:type" content="website" />
	{/if}
</svelte:head>

{#if !scoreData}
	<!-- Landing Page Layout -->
	<div class="min-h-screen flex flex-col bg-slate-50 relative font-sans">
		<!-- Header -->
		<header class="flex justify-between items-center px-6 py-4 absolute top-0 w-full z-10">
			<div class="flex items-center gap-2">
				<div class="w-8 h-8 text-emerald-600">
					<!-- Leaf Icon -->
					<Leaf class="w-full h-full" strokeWidth={1.5} />
				</div>
				<span class="font-bold text-lg text-slate-800 tracking-tight">TranquilTaiwan</span>
			</div>
			<!-- Login removed, Language Switcher added -->
			<LanguageSwitcher />
		</header>

		<!-- Hero Section -->
		<main class="flex-grow flex flex-col items-center justify-center px-4 w-full max-w-2xl mx-auto -mt-10">
			<div class="text-center mb-10 space-y-4">
				<h1 class="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
					Find your <span class="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-800">future apartment</span>
				</h1>
				<p class="text-lg text-slate-500 font-light max-w-2xl mx-auto leading-relaxed">
					{m.landing_subtitle()}
				</p>
			</div>

			<!-- Search Component -->
			<div class="w-full relative group z-20">
				<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
					<!-- Helper icon if needed -->
				</div>
				<input
					type="text"
					bind:value={address}
					placeholder={m.search_placeholder()}
					class="w-full py-5 pl-6 pr-14 rounded-2xl text-lg bg-white shadow-lg border-0 ring-1 ring-slate-100 focus:ring-4 focus:ring-emerald-100 transition-all placeholder:text-slate-400 text-slate-800"
					onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && searchAddress()}
				/>
				<button
					onclick={() => searchAddress()}
					disabled={loading}
					class="absolute right-3 top-3 bottom-3 aspect-square text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
					aria-label={m.search_button()}
				>
					{#if loading}
						<svg class="animate-spin h-5 w-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					{:else}
						<Search class="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
					{/if}
				</button>
			</div>

			<!-- Social Proof / Quick Filters -->
			<div class="mt-8 text-center w-full">
				<p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
					{m.landing_social_proof()}
				</p>
				<div class="flex flex-wrap justify-center gap-3 mt-6">
					<button onclick={() => searchAddress(m.landing_example_1())} class="bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-emerald-500 hover:text-emerald-700 hover:shadow-md transition-all duration-300 rounded-full px-6 py-2 text-sm font-medium flex items-center">
						<MapPin class="w-3 h-3 mr-2 inline" strokeWidth={1.5} />
						{m.landing_example_1()}
					</button>
					<button onclick={() => searchAddress(m.landing_example_2())} class="bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-emerald-500 hover:text-emerald-700 hover:shadow-md transition-all duration-300 rounded-full px-6 py-2 text-sm font-medium flex items-center">
						<MapPin class="w-3 h-3 mr-2 inline" strokeWidth={1.5} />
						{m.landing_example_2()}
					</button>
					<button onclick={() => searchAddress(m.landing_example_3())} class="bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-emerald-500 hover:text-emerald-700 hover:shadow-md transition-all duration-300 rounded-full px-6 py-2 text-sm font-medium flex items-center">
						<MapPin class="w-3 h-3 mr-2 inline" strokeWidth={1.5} />
						{m.landing_example_3()}
					</button>
				</div>
			</div>
			
			{#if error}
				<div class="mt-6 w-full animate-fade-in">
					<div class="bg-orange-50 border border-orange-100 text-orange-700 px-4 py-3 rounded-xl flex items-start gap-3">
						<AlertCircle class="stroke-current shrink-0 h-5 w-5 mt-0.5" strokeWidth={1.5} />
						<span>{error}</span>
					</div>
				</div>
			{/if}
		</main>

		<!-- Footer -->
		<footer class="py-6 text-center text-sm text-slate-400 space-x-6">
			<a href="/about" class="hover:text-slate-600 transition-colors">{m.landing_footer_about()}</a>
			<a href="/sources" class="hover:text-slate-600 transition-colors">{m.landing_footer_sources()}</a>
		</footer>
	</div>
{:else}
	<!-- Detailed Report View (Immersive Design) -->
	<div class="min-h-screen bg-slate-50 relative pb-32 font-sans">
		
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
			<div class="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none"></div>
			
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
				<Card.Root class="backdrop-blur-xl bg-white/90 border border-white/50 shadow-xl rounded-2xl overflow-hidden">
					<Card.Header class="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
						<div class="space-y-2">
							<Card.Title class="text-2xl md:text-3xl font-bold text-slate-900">{scoreData.address}</Card.Title>
							<div class="flex items-center gap-2 text-emerald-700 font-medium">
								<MapPin class="w-4 h-4" strokeWidth={1.5} />
								<span>{m.report_env_title()} - {getScoreLabel(scoreData.scores.overall)}</span>
							</div>
						</div>
						
						<div class="flex items-center gap-4 bg-slate-50/50 p-2 rounded-2xl border border-slate-100/50">
							<div class="flex flex-col items-end">
								<span class="text-xs text-slate-500 uppercase font-semibold tracking-wider">{m.livability_score()}</span>
								<Badge variant={scoreData.scores.overall >= 80 ? 'default' : scoreData.scores.overall >= 60 ? 'secondary' : 'destructive'} class="text-xs">
									{getScoreLabel(scoreData.scores.overall)}
								</Badge>
							</div>
							<div class="relative flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm border-4 {scoreData.scores.overall >= 80 ? 'border-emerald-100' : scoreData.scores.overall >= 60 ? 'border-yellow-100' : 'border-orange-100'}">
								<span class="text-2xl font-bold {getScoreColor(scoreData.scores.overall)}">
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
			<div class="pointer-events-auto">
				<Button 
					variant="outline" 
					size="icon" 
					class="bg-white/70 backdrop-blur-md shadow-sm hover:bg-white rounded-full border-0"
					onclick={() => goto('/')}
					aria-label={m.teaser_back()}
				>
					<ArrowLeft class="w-5 h-5 text-slate-700" strokeWidth={1.5} />
				</Button>
			</div>
			<div class="pointer-events-auto">
				<LanguageSwitcher />
			</div>
		</header>

		<!-- 3. Spacer -->
		<div class="h-[60vh] md:h-[65vh] w-full pointer-events-none"></div>

		<!-- 4. Content Container -->
		<div class="relative z-20 px-4 max-w-4xl mx-auto space-y-8 mt-24">
			
			<!-- Native Ad (Partenaire) -->
			<NativeAdCard 
				title="Isolation Phonique Pro" 
				description="Réduisez les bruits de la rue de 40dB avec nos nouvelles fenêtres double vitrage. Devis gratuit pour ce quartier."
				image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" 
			/>

			<!-- Data Cards Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
				
				<!-- Noise Section -->
				<Card.Root class="h-full bg-white border-slate-100 shadow-md hover:shadow-lg transition-all duration-300 mb-6 md:mb-0">
					<Card.Header class="pb-4 relative">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
									<Volume2 class="w-5 h-5" strokeWidth={1.5} />
								</div>
								<Card.Title>{m.report_noise_title()}</Card.Title>
							</div>
							<Badge variant="outline" class="font-bold text-sm bg-slate-50">
								{Math.round(scoreData.detailedData?.noise?.level || 0)} dB
							</Badge>
						</div>
						<div class="absolute top-6 right-6">
							<InfoHint 
								title="Comment lire les dB ?" 
								description="40dB = Bibliothèque. 60dB = Conversation. 80dB = Trafic intense. Au-delà de 65dB, le sommeil peut être perturbé."
							/>
						</div>
					</Card.Header>
					
					<Card.Content>
						{#if scoreData.detailedData?.noise}
							{@const noiseData = scoreData.detailedData.noise}
							<div class="mb-6 space-y-3">
								<div class="flex justify-between items-center">
									<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">
										Niveau Sonore
									</span>
									<span class="{noiseData.level >= 60 ? 'text-orange-600' : 'text-emerald-600'} font-bold text-sm">
										{noiseData.level >= 80 ? 'Very Noisy' : noiseData.level >= 60 ? 'Noisy' : 'Quiet'}
									</span>
								</div>
								
								<!-- Chart.js Line Chart -->
								<NoiseLineChart noiseLevel={noiseData.level} />
							</div>

							<div class="space-y-3">
								{#if noiseData.nearbyTemples > 0}
									<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
										<div class="p-2 rounded-full bg-white text-orange-500 shadow-sm">
											<Speaker class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<div class="flex-1">
											<p class="text-sm font-medium text-slate-900">Temple Nearby</p>
											<p class="text-xs text-slate-500">
												{m.report_noise_item_temple({ 
													distance: noiseData.nearbyTemples, 
													risk: noiseData.nearbyTemples > 1 ? m.risk_high() : m.risk_low() 
												})}
											</p>
										</div>
									</div>
								{/if}
								{#if noiseData.majorRoads > 0}
									<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
										<div class="p-2 rounded-full bg-white text-orange-500 shadow-sm">
											<Bus class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<div class="flex-1">
											<p class="text-sm font-medium text-slate-900">Major Roads</p>
											<p class="text-xs text-slate-500">
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
							<p class="text-sm text-slate-500">Noise data not available</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Environment & Risks Section -->
				<Card.Root class="h-full bg-white border-slate-100 shadow-md hover:shadow-lg transition-all duration-300 mb-6 md:mb-0">
					<Card.Header class="pb-4 relative">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
								<Wind class="w-5 h-5" strokeWidth={1.5} />
							</div>
							<Card.Title>{m.report_env_title()}</Card.Title>
						</div>
						<div class="absolute top-6 right-6">
							<InfoHint 
								title="Indice de Qualité de l'Air" 
								description="En dessous de 50 : Excellent. Au-dessus de 100 : Risqué pour les asthmatiques et enfants."
							/>
						</div>
					</Card.Header>

					<Card.Content>
						{#if scoreData.detailedData?.airQuality}
							{@const airData = scoreData.detailedData.airQuality}
							{@const isIndus = scoreData.detailedData?.zoning?.adjacentIndustrial}
							{@const zoningLabel = isIndus ? 'Industrial Nearby' : scoreData.detailedData?.zoning?.adjacentHighIntensityCommercial ? 'Commercial Area' : m.zoning_residential()}
							
							{@const aqiStyles = airData.aqi <= 50 
								? { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: 'Good' }
								: airData.aqi <= 100 
								? { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', label: 'Moderate' }
								: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'Unhealthy' }
							}
							
							<div class="grid grid-cols-2 gap-4 h-full">
								<!-- Left Column: Main Indicator -->
								<div class="flex flex-col items-center justify-center p-4 rounded-3xl {aqiStyles.bg} h-full min-h-[160px]">
									<span class="text-xs uppercase font-bold text-slate-500 mb-2 tracking-wider">Air Quality Index</span>
									<span class="text-5xl font-bold {aqiStyles.text} mb-2">{airData.aqi}</span>
									<Badge variant="outline" class="bg-white/80 {aqiStyles.border} {aqiStyles.text} shadow-sm px-3 py-1 text-xs font-semibold">
										{aqiStyles.label}
									</Badge>
								</div>

								<!-- Right Column: Details List -->
								<div class="flex flex-col justify-between py-1 gap-4">
									
									<!-- PM2.5 -->
									<div class="space-y-1.5">
										<div class="flex items-center gap-2">
											<Wind class="w-4 h-4 text-slate-400" strokeWidth={2} />
											<span class="text-sm font-medium text-slate-700">PM2.5</span>
											<span class="ml-auto text-sm font-bold text-slate-900">{airData.pm25} µg/m³</span>
										</div>
										<Progress value={Math.min((airData.pm25 / 50) * 100, 100)} class="h-1.5 bg-slate-100" />
									</div>

									<!-- Dengue -->
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<Bug class="w-4 h-4 text-slate-400" strokeWidth={2} />
											<span class="text-sm font-medium text-slate-700">Dengue</span>
										</div>
										{#if airData.dengueRisk}
											<Badge variant="destructive" class="text-[10px] px-2 py-0.5 h-6">Risk</Badge>
										{:else}
											<Badge variant="outline" class="text-[10px] px-2 py-0.5 h-6 bg-emerald-50 text-emerald-700 border-emerald-200">Safe</Badge>
										{/if}
									</div>

									<!-- Zoning -->
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<Building class="w-4 h-4 text-slate-400" strokeWidth={2} />
											<span class="text-sm font-medium text-slate-700">Zoning</span>
										</div>
										<span class="text-xs font-medium text-slate-600 text-right truncate max-w-[100px]" title={zoningLabel}>
											{zoningLabel}
										</span>
									</div>
								</div>
							</div>
						{:else}
							<p class="text-sm text-slate-500">Air quality data not available</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Safety Section -->
				<Card.Root class="h-full bg-white border-slate-100 shadow-md hover:shadow-lg transition-all duration-300 mb-6 md:mb-0">
					<Card.Header class="pb-4 relative">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
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
								
								<div class="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
									<AlertCircle class="w-4 h-4 text-slate-400" strokeWidth={1.5} />
									<span>Crime rate: {(safetyData.crimeRate * 100).toFixed(1)}% | Accident hotspots: {safetyData.accidentHotspots}</span>
								</div>
							</div>

							{#if safetyData.accidentHotspots > 0}
								<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
									<div class="p-2 rounded-full bg-white text-orange-600 shadow-sm">
										<AlertCircle class="w-4 h-4" strokeWidth={1.5} />
									</div>
									<div class="flex-1">
										<p class="text-sm font-medium text-slate-900">Accident Hotspots</p>
										<p class="text-xs text-slate-500">
											{m.report_safety_accident({ time: `${safetyData.accidentHotspots} hotspot${safetyData.accidentHotspots > 1 ? 's' : ''} nearby` })}
										</p>
									</div>
								</div>
							{/if}
						{:else}
							<p class="text-sm text-slate-500">Safety data not available</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Convenience Section (Walkability List) -->
				{#if scoreData.detailedData?.convenience}
					{@const convenienceData = scoreData.detailedData.convenience}
					{@const walkScore = Math.min(100, Math.round(convenienceData.publicTransportScore * 0.4 + (convenienceData.youbikeStations > 0 ? 30 : 0) + (convenienceData.trashCollectionPoints > 0 ? 20 : 0) + 10))}
					{@const walkScoreLabel = walkScore >= 90 ? 'Walker Paradise' : walkScore >= 70 ? 'Very Walkable' : walkScore >= 50 ? 'Somewhat Walkable' : 'Car Dependent'}
					<Card.Root class="h-full bg-white border-slate-100 shadow-md hover:shadow-lg transition-all duration-300 mb-6 md:mb-0">
						<Card.Header class="pb-4 relative">
							<div class="flex items-center justify-between mb-4">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
										<Bike class="w-5 h-5" strokeWidth={1.5} />
									</div>
									<Card.Title>{m.convenience()}</Card.Title>
								</div>
							</div>
							
							<!-- Walk Score -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-semibold text-slate-700">Walk Score</p>
										<p class="text-xs text-slate-500">{walkScoreLabel}</p>
									</div>
									<div class="text-right">
										<span class="text-2xl font-bold text-emerald-600">{walkScore}</span>
										<span class="text-sm text-slate-400">/100</span>
									</div>
								</div>
								<Progress value={walkScore} class="h-1.5" />
							</div>
						</Card.Header>
						
						<Card.Content class="space-y-4">
							<!-- Transport: Daan Park Station -->
							<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-indigo-50 text-indigo-600">
										<TrainFront size={18} strokeWidth={1.5} />
									</div>
									<div>
										<p class="font-medium text-slate-900">Daan Park Station</p>
										<p class="text-xs text-slate-500">Red Line • Exit 2</p>
									</div>
								</div>
								<div class="text-right">
									<Badge variant="secondary" class="bg-slate-100 text-slate-700">4 min</Badge>
									<p class="text-[10px] text-slate-400 mt-1">350m</p>
								</div>
							</div>

							<!-- Daily Life: 7-Eleven -->
							<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
								<div class="flex items-center gap-3">
									<div class="p-2 rounded-lg bg-emerald-50 text-emerald-600">
										<Store size={18} strokeWidth={1.5} />
									</div>
									<div>
										<p class="font-medium text-slate-900">7-Eleven</p>
										<p class="text-xs text-slate-500">24/7 Convenience Store</p>
									</div>
								</div>
								<div class="text-right">
									<Badge variant="secondary" class="bg-slate-100 text-slate-700">1 min</Badge>
									<p class="text-[10px] text-slate-400 mt-1">80m</p>
								</div>
							</div>

							<!-- Bike: YouBike Station -->
							{#if convenienceData.youbikeStations > 0}
								<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
									<div class="flex items-center gap-3">
										<div class="p-2 rounded-lg bg-emerald-50 text-emerald-600">
											<Bike size={18} strokeWidth={1.5} />
										</div>
										<div>
											<p class="font-medium text-slate-900">YouBike Station</p>
											<p class="text-xs text-slate-500">Xinyi/Jianguo</p>
										</div>
									</div>
									<div class="text-right">
										<Badge variant="secondary" class="bg-slate-100 text-slate-700">2 min</Badge>
										<p class="text-[10px] text-slate-400 mt-1">{convenienceData.nearestYoubikeDistance || 150}m</p>
									</div>
								</div>
							{/if}

							<!-- Trash: Evening Pickup Spot -->
							{#if convenienceData.trashCollectionPoints > 0}
								<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
									<div class="flex items-center gap-3">
										<div class="p-2 rounded-lg bg-amber-50 text-amber-600">
											<Trash2 size={18} strokeWidth={1.5} />
										</div>
										<div>
											<p class="font-medium text-slate-900">Evening Pickup Spot</p>
											<p class="text-xs text-slate-500">19:30 • In the street</p>
										</div>
									</div>
									<div class="text-right">
										<Badge variant="secondary" class="bg-slate-100 text-slate-700">0 min</Badge>
										<p class="text-[10px] text-slate-400 mt-1">On site</p>
									</div>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Bottom Ad Placeholder -->
			<div class="px-4 py-4 max-w-2xl mx-auto">
				<NativeAdCard 
					title="Déménagement Zen" 
					description="Service de déménagement silencieux et rapide. Évitez le stress du changement."
					image="https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" 
				/>
			</div>
		</div>
		
		<!-- Floating Action Bar -->
		<div class="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
			<div class="bg-white/80 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border border-slate-200/50 rounded-2xl p-3 flex items-center justify-between pointer-events-auto max-w-2xl mx-auto gap-4">
				<div class="flex items-center gap-3 pl-2">
					<div class="text-sm font-medium text-slate-900">
						Like this report?
					</div>
				</div>
				<!-- Secondary Action: Share -->
				<Button 
					variant="ghost" 
					size="icon"
					onclick={shareResult}
					class="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" 
					aria-label={m.report_share_button()}
				>
					<Share2 class="w-5 h-5" strokeWidth={1.5} />
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.leaflet-container) {
		font-family: inherit;
		background: #F8FAFC;
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
