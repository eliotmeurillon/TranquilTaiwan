<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getLocale } from '$lib/paraglide/runtime';
	import LeafletMap from '$lib/components/LeafletMap.svelte';
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
		Search
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
		<div class="absolute top-0 left-0 w-full h-[65vh] z-0">
			<LeafletMap
				latitude={scoreData.coordinates.latitude}
				longitude={scoreData.coordinates.longitude}
				address={scoreData.address}
				noiseScore={scoreData.scores.noise}
				airQualityScore={scoreData.scores.airQuality}
				zoom={15}
				detailedData={scoreData.detailedData}
				pointsOfInterest={pointsOfInterest}
			/>
			<!-- Gradient Overlay -->
			<div class="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent z-10 pointer-events-none"></div>

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
		<div class="h-[65vh] w-full pointer-events-none"></div>

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
				<Card.Root class="h-full border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
					<Card.Header class="pb-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
									<Volume2 class="w-5 h-5" strokeWidth={1.5} />
								</div>
								<Card.Title>{m.report_noise_title()}</Card.Title>
								<InfoHint 
									title="Comment lire les dB ?" 
									description="40dB = Bibliothèque. 60dB = Conversation. 80dB = Trafic intense. Au-delà de 65dB, le sommeil peut être perturbé."
								/>
							</div>
							<Badge variant="outline" class="font-bold text-sm bg-slate-50">
								{Math.round(scoreData.detailedData?.noise?.level || 0)} dB
							</Badge>
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
								
								<!-- Progress Bar with Custom Color Logic -->
								<!-- 100% = Very Noisy (Red) -->
								<div class="space-y-1">
									<Progress 
										value={noiseData.level} 
										class="h-3 [&>div]:{noiseData.level >= 80 ? 'bg-red-500' : noiseData.level >= 60 ? 'bg-orange-500' : 'bg-emerald-500'}" 
									/>
									<div class="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
										<span>Calme</span>
										<span>Bruyant</span>
									</div>
								</div>
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
				<Card.Root class="h-full border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
					<Card.Header class="pb-4">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
								<Wind class="w-5 h-5" strokeWidth={1.5} />
							</div>
							<Card.Title>{m.report_env_title()}</Card.Title>
						</div>
					</Card.Header>

					<Card.Content>
						{#if scoreData.detailedData?.airQuality}
							{@const airData = scoreData.detailedData.airQuality}
							<div class="flex items-center gap-6 mb-6">
								<!-- Big AQI Badge -->
								<div class="flex-shrink-0 w-20 h-20 rounded-2xl {airData.aqi <= 50 ? 'bg-emerald-50 text-emerald-600' : airData.aqi <= 100 ? 'bg-yellow-50 text-yellow-600' : 'bg-orange-50 text-orange-600'} flex flex-col items-center justify-center p-2 border border-black/5 relative">
									<div class="flex items-center gap-1">
										<span class="text-[10px] font-bold uppercase opacity-70 mb-0.5">AQI</span>
										<div class="absolute -top-1 -right-1">
											<InfoHint 
												title="Indice de Qualité de l'Air" 
												description="En dessous de 50 : Excellent. Au-dessus de 100 : Risqué pour les asthmatiques et enfants."
											/>
										</div>
									</div>
									<span class="text-3xl font-bold tracking-tighter">{airData.aqi}</span>
								</div>
								
								<div class="flex-1 space-y-1">
									<div class="font-bold text-lg text-slate-900 leading-tight">
										{airData.aqi <= 50 ? 'Good Air' : airData.aqi <= 100 ? 'Moderate' : airData.aqi <= 150 ? 'Unhealthy' : 'Very Unhealthy'}
									</div>
									{#if airData.pm25}
										<div class="text-xs font-medium text-slate-500 uppercase tracking-wider">
											PM2.5: <span class="text-slate-700 font-semibold">{airData.pm25} μg/m³</span>
										</div>
									{/if}
								</div>
							</div>

							<div class="space-y-3">
								<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
									<div class="p-2 rounded-full bg-white text-slate-600 shadow-sm">
										<Bug class="w-4 h-4" strokeWidth={1.5} />
									</div>
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<p class="text-sm font-medium text-slate-900">Dengue Risk</p>
											<InfoHint 
												title="Risque Épidémique" 
												description="Basé sur l'historique des foyers de moustiques du CDC Taïwan sur les 12 derniers mois."
											/>
										</div>
										<p class="text-xs text-slate-500">{airData.dengueRisk ? m.risk_high() : m.risk_none()}</p>
									</div>
									{#if airData.dengueRisk}
										<AlertCircle class="w-4 h-4 text-orange-500" strokeWidth={1.5} />
									{/if}
								</div>

								{#if scoreData.detailedData?.zoning}
									{@const zoningData = scoreData.detailedData.zoning}
									{@const isIndus = zoningData.adjacentIndustrial}
									<div class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
										<div class="p-2 rounded-full bg-white text-slate-600 shadow-sm">
											<Factory class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<div class="flex-1">
											<p class="text-sm font-medium text-slate-900">Zoning</p>
											<p class="text-xs text-slate-500">
												{isIndus ? 'Industrial Nearby' : zoningData.adjacentHighIntensityCommercial ? 'Commercial Area' : m.zoning_residential()}
											</p>
										</div>
										{#if isIndus}
											<AlertCircle class="w-4 h-4 text-orange-500" strokeWidth={1.5} />
										{/if}
									</div>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-slate-500">Air quality data not available</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Safety Section -->
				<Card.Root class="h-full border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
					<Card.Header class="pb-4">
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
								<div class="space-y-2">
									<div class="flex justify-between items-center">
										<span class="text-xs font-medium text-slate-400 uppercase tracking-wider">
											{m.report_safety_burglary()}
										</span>
										<span class="font-bold text-sm text-slate-900">{Math.round(safetyData.pedestrianSafety)}%</span>
									</div>
									<!-- 100% = Safe (Green), 0% = Dangerous (Red) -->
									<div class="space-y-1">
										<Progress 
											value={safetyData.pedestrianSafety} 
											class="h-3 [&>div]:{safetyData.pedestrianSafety >= 80 ? 'bg-emerald-500' : safetyData.pedestrianSafety >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" 
										/>
										<div class="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
											<span>Dangereux</span>
											<span>Sûr</span>
										</div>
									</div>
								</div>
								
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

				<!-- Convenience Section (Grid Layout) -->
				{#if scoreData.detailedData?.convenience}
					{@const convenienceData = scoreData.detailedData.convenience}
					<Card.Root class="h-full border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
						<Card.Header class="pb-4">
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
									<Bike class="w-5 h-5" strokeWidth={1.5} />
								</div>
								<Card.Title>{m.convenience()}</Card.Title>
							</div>
						</Card.Header>
						
						<Card.Content>
							<div class="grid grid-cols-2 gap-4">
								<div class="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
									<div class="flex items-center gap-2">
										<div class="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
											<Bike class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<span class="text-xs font-semibold text-slate-700">YouBike</span>
									</div>
									<div class="text-xs text-slate-500">
										{convenienceData.youbikeStations} stations<br/>
										({convenienceData.nearestYoubikeDistance}m)
									</div>
								</div>

								{#if convenienceData.trashCollectionPoints > 0}
									<div class="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
										<div class="flex items-center gap-2">
											<div class="p-1.5 rounded-lg bg-amber-100 text-amber-600">
												<Trash2 class="w-4 h-4" strokeWidth={1.5} />
											</div>
											<span class="text-xs font-semibold text-slate-700">Trash</span>
										</div>
										<div class="text-xs text-slate-500">
											{convenienceData.trashCollectionPoints} points
										</div>
									</div>
								{/if}

								{#if convenienceData.waterPoints > 0}
									<div class="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
										<div class="flex items-center gap-2">
											<div class="p-1.5 rounded-lg bg-blue-100 text-blue-600">
												<Droplets class="w-4 h-4" strokeWidth={1.5} />
											</div>
											<span class="text-xs font-semibold text-slate-700">Water</span>
										</div>
										<div class="text-xs text-slate-500">
											{convenienceData.waterPoints} points
										</div>
									</div>
								{/if}

								<div class="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
									<div class="flex items-center gap-2">
										<div class="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
											<Bus class="w-4 h-4" strokeWidth={1.5} />
										</div>
										<span class="text-xs font-semibold text-slate-700">Transit</span>
									</div>
									<div class="text-xs text-slate-500">
										Score: {Math.round(convenienceData.publicTransportScore)}/100
									</div>
								</div>
							</div>
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
