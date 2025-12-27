<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { getLocale } from '$lib/paraglide/runtime';
	import LeafletMap from '$lib/components/LeafletMap.svelte';
	import * as m from '$lib/paraglide/messages';

	// Define PointOfInterest type locally
	type PointOfInterest = {
		type: 'temple' | 'accident' | 'factory' | 'youbike' | 'transport' | 'trash';
		latitude: number;
		longitude: number;
		label: string;
		details?: string;
	};

	// Make the component reactive to locale changes
	let locale = $state(getLocale());
	
	// Update locale when navigation happens
	afterNavigate(() => {
		locale = getLocale();
	});
	
	// Watch for locale changes
	$effect(() => {
		locale = getLocale();
	});

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
		premium: boolean;
		detailedData?: any;
	}

	let address = $state('');
	let loading = $state(false);
	let scoreData = $state<ScoreData | null>(null);
	let error = $state<string | null>(null);
	let showPremium = $state(false);
	let pointsOfInterest = $state<PointOfInterest[]>([]);

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
		if (queryAddress) address = queryAddress;

		if (!targetAddress.trim()) {
			error = m.error_please_enter_address();
			return;
		}

		loading = true;
		error = null;
		scoreData = null;
		showPremium = false;
		pointsOfInterest = [];

		try {
			const response = await fetch(`/api/score?address=${encodeURIComponent(targetAddress)}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || m.error_failed_calculate());
			}

			const data = await response.json();
			scoreData = data;
			pointsOfInterest = generatePOIs(data);
		} catch (err) {
			error = err instanceof Error ? err.message : m.error_occurred();
		} finally {
			loading = false;
		}
	}

	async function getPremiumReport() {
		if (!browser) return;
		
		if (!address.trim() || !scoreData) return;

		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/report?address=${encodeURIComponent(address)}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || m.error_failed_fetch_report());
			}

			const data = await response.json();
			scoreData = data;
			showPremium = true;
			pointsOfInterest = generatePOIs(data);
		} catch (err) {
			error = err instanceof Error ? err.message : m.error_occurred();
		} finally {
			loading = false;
		}
	}

	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-emerald-700';
		if (score >= 60) return 'text-yellow-600';
		return 'text-orange-600';
	}

	function getScoreBg(score: number): string {
		if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
		if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
		return 'bg-orange-100 text-orange-800 border-orange-200';
	}
	
	function getProgressClass(score: number): string {
		if (score >= 80) return 'text-emerald-600';
		if (score >= 60) return 'text-yellow-500';
		return 'text-orange-500';
	}

	function getScoreLabel(score: number): string {
		if (score >= 80) return m.score_excellent();
		if (score >= 60) return m.score_good();
		if (score >= 40) return m.score_fair();
		return m.score_poor();
	}

	function getTeaserSummary(data: ScoreData): string {
		// Logic to determine summary string params
		// "This address is {noiseLevel}, but watch out for {concern}."
		
		let noiseLevel = m.teaser_noise_status_moderate();
		if (data.scores.noise >= 80) noiseLevel = m.teaser_noise_status_quiet();
		else if (data.scores.noise < 60) noiseLevel = m.teaser_noise_status_noisy();

		// Find the lowest score among other categories to highlight as concern
		const concerns = [
			{ score: data.scores.airQuality, name: m.teaser_concern_air() },
			{ score: data.scores.safety, name: m.teaser_concern_safety() },
			{ score: data.scores.convenience, name: m.teaser_concern_convenience() }
		];
		
		concerns.sort((a, b) => a.score - b.score);
		const concern = concerns[0].score < 70 ? concerns[0].name : m.teaser_concern_none();

		return m.teaser_summary({ noiseLevel, concern });
	}
</script>

{#if !scoreData}
	<!-- Landing Page Layout -->
	<div class="min-h-screen flex flex-col bg-slate-50 relative">
		<!-- Header -->
		<header class="flex justify-between items-center px-6 py-4 absolute top-0 w-full z-10">
			<div class="flex items-center gap-2">
				<div class="w-8 h-8 text-emerald-600">
					<!-- Leaf Icon -->
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
						<path fill-rule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h14.062a2.625 2.625 0 002.625-2.625c0-.531-.104-1.038-.293-1.505a.75.75 0 00-1.295.536 1.125 1.125 0 01.088.469c0 .76-.616 1.375-1.375 1.375h-2.937a.75.75 0 000 1.5H19.5a2.25 2.25 0 002.25-2.25c0-1.036-.84-1.875-1.875-1.875h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.75a2.25 2.25 0 00-2.25-2.25c-.414 0-.75.336-.75.75v.75H12a2.25 2.25 0 00-2.25 2.25v2.625H9v-2.625c0-1.036-.84-1.875-1.875-1.875h-.375c.162-1.36.852-2.583 1.9-3.484a.75.75 0 10-.982-1.134 6.753 6.753 0 00-1.9 3.484h-.375c-1.036 0-1.875.84-1.875 1.875V15h-.75c-1.036 0-1.875.84-1.875 1.875v2.625c0 .414.336.75.75.75h.75v.75a2.25 2.25 0 002.25 2.25h.375v.75c0 .414.336.75.75.75h.75v-.75h.375a2.25 2.25 0 002.25-2.25v-.75H12v.75c0 .414.336.75.75.75h.75v-.75h.375a2.25 2.25 0 002.25-2.25v-.75H16.5v.75c0 .414.336.75.75.75h.75v-2.625c0-.414-.336-.75-.75-.75h-.75V15h.75c.414 0 .75-.336.75-.75v-2.625c0-.414-.336-.75-.75-.75h-.375c-.322-1.096-.948-2.072-1.776-2.825a.75.75 0 00-.992 1.116 5.253 5.253 0 011.268 2.02h-2.25c-.322-1.096-.948-2.072-1.776-2.825a.75.75 0 10-.992 1.116 5.253 5.253 0 011.268 2.02h-.75V8.25a.75.75 0 00-.75-.75h-.75V4.5a.75.75 0 00-.75-.75H5.166z" clip-rule="evenodd" />
					</svg>
				</div>
				<span class="font-bold text-lg text-slate-800 tracking-tight">TranquilTaiwan</span>
			</div>
			<button class="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
				{m.landing_login()}
			</button>
		</header>

		<!-- Hero Section -->
		<main class="flex-grow flex flex-col items-center justify-center px-4 w-full max-w-2xl mx-auto -mt-10">
			<div class="text-center mb-10 space-y-4">
				<h1 class="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
					{m.landing_title()}
				</h1>
				<p class="text-lg md:text-xl text-slate-500 max-w-lg mx-auto leading-relaxed">
					{m.landing_subtitle()}
				</p>
			</div>

			<!-- Search Component -->
			<div class="w-full relative group z-20">
				<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
					<!-- Helper icon if needed, but per design icon is right -->
				</div>
				<input
					type="text"
					bind:value={address}
					placeholder={m.search_placeholder()}
					class="w-full py-5 pl-6 pr-14 rounded-2xl text-lg bg-white shadow-lg border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400 text-slate-800"
					onkeydown={(e) => e.key === 'Enter' && searchAddress()}
				/>
				<button
					onclick={() => searchAddress()}
					disabled={loading}
					class="absolute right-3 top-3 bottom-3 aspect-square text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors"
					aria-label={m.search_button()}
				>
					{#if loading}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					{/if}
				</button>
			</div>

			<!-- Social Proof -->
			<div class="mt-8 text-center w-full">
				<p class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
					{m.landing_social_proof()}
				</p>
				<div class="flex flex-wrap justify-center gap-2">
					<button onclick={() => searchAddress(m.landing_example_1())} class="btn btn-sm btn-ghost bg-white border border-slate-200 rounded-full font-normal text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 normal-case">
						{m.landing_example_1()}
					</button>
					<button onclick={() => searchAddress(m.landing_example_2())} class="btn btn-sm btn-ghost bg-white border border-slate-200 rounded-full font-normal text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 normal-case">
						{m.landing_example_2()}
					</button>
					<button onclick={() => searchAddress(m.landing_example_3())} class="btn btn-sm btn-ghost bg-white border border-slate-200 rounded-full font-normal text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 normal-case">
						{m.landing_example_3()}
					</button>
				</div>
			</div>
			
			{#if error}
				<div class="mt-6 w-full animate-fade-in">
					<div class="bg-orange-50 border border-orange-100 text-orange-700 px-4 py-3 rounded-xl flex items-start gap-3">
						<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5 mt-0.5" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
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
{:else if showPremium}
	<!-- Detailed Report View -->
	<div class="min-h-screen bg-slate-50 pb-32">
		<!-- Floating Header (Integrated) -->
		<div class="fixed top-4 left-4 right-4 z-40 pointer-events-none">
			<div class="bg-white/90 backdrop-blur-xl shadow-sm border border-slate-200/50 rounded-full px-2 py-2 flex items-center gap-3 pointer-events-auto max-w-2xl mx-auto">
				<button onclick={() => showPremium = false} class="btn btn-circle btn-sm btn-ghost hover:bg-slate-100 text-slate-500 transition-colors" aria-label={m.teaser_back()}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
					</svg>
				</button>
				<div class="flex-1 min-w-0 pr-4">
					<div class="font-bold text-slate-800 truncate text-sm leading-tight">
						{scoreData.address}
					</div>
					<div class="text-[10px] text-emerald-600 font-medium uppercase tracking-wide leading-none mt-0.5">
						Premium Report Unlocked
					</div>
				</div>
				<div class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
					<!-- User/Menu Placeholder -->
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
						<path fill-rule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
					</svg>
				</div>
			</div>
		</div>

		<!-- Map Section -->
		<div class="h-[45vh] min-h-[350px] w-full bg-slate-100 relative z-0">
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
		</div>

		<div class="px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
			<!-- Noise Section -->
			<section class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
							</svg>
						</div>
						<h2 class="text-xl font-bold text-slate-800">{m.report_noise_title()}</h2>
					</div>
					<div class="badge {scoreData.detailedData?.noise?.level >= 60 ? 'badge-warning' : 'badge-success'} badge-outline font-bold">
						{Math.round(scoreData.detailedData?.noise?.level || 0)} dB
					</div>
				</div>
				
				{#if scoreData.detailedData?.noise}
					{@const noiseData = scoreData.detailedData.noise}
					<div class="mb-6">
						<div class="mb-2 flex justify-between items-baseline">
							<span class="text-sm font-bold text-slate-700">
								Noise Level: 
								<span class="{noiseData.level >= 60 ? 'text-orange-600' : 'text-emerald-600'}">
									{noiseData.level >= 80 ? 'Very Noisy' : noiseData.level >= 60 ? 'Noisy' : 'Quiet'}
								</span>
							</span>
						</div>
						
						<!-- Gradient Gauge -->
						<div class="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden">
							<div class="absolute inset-0 bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 opacity-80"></div>
							<!-- Cursor -->
							<div 
								class="absolute top-0 bottom-0 w-1 bg-black shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10 transition-all duration-500"
								style="left: {Math.min(Math.max(noiseData.level, 0), 100)}%"
							></div>
						</div>
						<div class="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
							<span>Quiet</span>
							<span>Noisy</span>
						</div>
					</div>

					<ul class="space-y-3 text-sm">
						{#if noiseData.nearbyTemples > 0}
							<li class="flex items-start gap-3 p-2 rounded-lg bg-orange-50 text-orange-700">
								<span class="mt-0.5">⚠️</span>
								<div>
									<span class="font-semibold block">Temple Nearby</span>
									<span class="text-xs opacity-90">{m.report_noise_item_temple({ 
										distance: noiseData.nearbyTemples, 
										risk: noiseData.nearbyTemples > 1 ? m.risk_high() : m.risk_low() 
									})}</span>
								</div>
							</li>
						{/if}
						{#if noiseData.majorRoads > 0}
							<li class="flex items-start gap-3 p-2 rounded-lg bg-orange-50 text-orange-700">
								<span class="mt-0.5">🚗</span>
								<div>
									<span class="font-semibold block">Major Roads Nearby</span>
									<span class="text-xs opacity-90">{m.report_noise_item_road({ 
										distance: noiseData.majorRoads * 200, 
										risk: noiseData.majorRoads > 1 ? m.risk_high() : m.risk_low() 
									})}</span>
								</div>
							</li>
						{/if}
						{#if noiseData.trafficIntensity > 0}
							<li class="flex items-start gap-3 p-2 rounded-lg {noiseData.trafficIntensity > 50 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-600'}">
								<span class="mt-0.5">{noiseData.trafficIntensity > 50 ? '🔊' : '🔉'}</span>
								<div>
									<span class="font-semibold block">Traffic Intensity</span>
									<span class="text-xs opacity-90">{Math.round(noiseData.trafficIntensity)}/100</span>
								</div>
							</li>
						{/if}
					</ul>
				{:else}
					<p class="text-sm text-slate-500">Noise data not available</p>
				{/if}
			</section>

			<!-- Environment & Risks Section -->
			<section class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
						</svg>
					</div>
					<h2 class="text-xl font-bold text-slate-800">{m.report_env_title()}</h2>
				</div>

				{#if scoreData.detailedData?.airQuality}
					{@const airData = scoreData.detailedData.airQuality}
					<div class="flex items-center gap-4 mb-6">
						<!-- Big AQI Badge -->
						<div class="flex-shrink-0 w-24 h-24 rounded-2xl {airData.aqi <= 50 ? 'bg-emerald-100 text-emerald-800' : airData.aqi <= 100 ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'} flex flex-col items-center justify-center p-2">
							<span class="text-xs font-bold uppercase opacity-70 mb-1">AQI</span>
							<span class="text-4xl font-bold tracking-tighter">{airData.aqi}</span>
						</div>
						
						<div class="flex-1 space-y-2">
							<div class="font-bold text-lg text-slate-800 leading-tight">
								{airData.aqi <= 50 ? 'Good' : airData.aqi <= 100 ? 'Moderate' : airData.aqi <= 150 ? 'Unhealthy' : 'Very Unhealthy'}
							</div>
							{#if airData.pm25}
								<div class="text-sm text-slate-500">PM2.5: <span class="font-medium text-slate-700">{airData.pm25} μg/m³</span></div>
							{/if}
						</div>
					</div>

					<div class="space-y-3">
						<div class="flex items-center justify-between p-3 rounded-xl {airData.dengueRisk ? 'bg-orange-50 text-orange-800' : 'bg-slate-50 text-slate-600'}">
							<span class="font-medium text-sm flex items-center gap-2">
								<span class="text-lg">🦟</span> Dengue Risk
							</span>
							<span class="font-bold text-sm">{airData.dengueRisk ? m.risk_high() : m.risk_none()}</span>
						</div>

						{#if scoreData.detailedData?.zoning}
							{@const zoningData = scoreData.detailedData.zoning}
							{@const isIndus = zoningData.adjacentIndustrial}
							<div class="flex items-center justify-between p-3 rounded-xl {isIndus ? 'bg-orange-50 text-orange-800' : 'bg-slate-50 text-slate-600'}">
								<span class="font-medium text-sm flex items-center gap-2">
									<span class="text-lg">🏭</span> Zoning
								</span>
								<span class="font-bold text-sm text-right">
									{isIndus ? 'Industrial Nearby' : zoningData.adjacentHighIntensityCommercial ? 'High-Intensity Commercial' : m.zoning_residential()}
								</span>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-slate-500">Air quality data not available</p>
				{/if}
			</section>

			<!-- Safety Section -->
			<section class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002z" />
						</svg>
					</div>
					<h2 class="text-xl font-bold text-slate-800">{m.report_safety_title()}</h2>
				</div>

				{#if scoreData.detailedData?.safety}
					{@const safetyData = scoreData.detailedData.safety}
					<div class="mb-6">
						<h3 class="text-sm font-medium text-slate-600 mb-2">{m.report_safety_burglary()}</h3>
						<!-- Simple Bar Chart Visualization -->
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<span class="text-xs w-16 text-slate-400">This area</span>
								<div class="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
									<div class="h-full bg-emerald-500 rounded-full" style="width: {safetyData.pedestrianSafety}%"></div>
								</div>
								<span class="text-xs text-slate-500 w-12 text-right">{Math.round(safetyData.pedestrianSafety)}%</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-xs w-16 text-slate-400">Avg</span>
								<div class="h-2 flex-1 bg-slate-200 rounded-full"></div>
								<span class="text-xs text-slate-500 w-12 text-right">70%</span>
							</div>
						</div>
						<div class="mt-3 text-xs text-slate-500">
							Crime rate: {(safetyData.crimeRate * 100).toFixed(1)}% | 
							Accident hotspots: {safetyData.accidentHotspots}
						</div>
					</div>

					{#if safetyData.accidentHotspots > 0}
						<div class="relative pl-4 border-l-2 border-slate-200 py-1">
							<div class="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400"></div>
							<p class="text-sm text-slate-600">
								{m.report_safety_accident({ time: `${safetyData.accidentHotspots} hotspot${safetyData.accidentHotspots > 1 ? 's' : ''} nearby` })}
							</p>
						</div>
					{/if}
				{:else}
					<p class="text-sm text-slate-500">Safety data not available</p>
				{/if}
			</section>

			<!-- Convenience Section -->
			{#if scoreData.detailedData?.convenience}
				{@const convenienceData = scoreData.detailedData.convenience}
				<section class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
					<div class="flex items-center gap-3 mb-4">
						<div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
								<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-4.5 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-4.5 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25" />
							</svg>
						</div>
						<h2 class="text-xl font-bold text-slate-800">{m.convenience()}</h2>
					</div>
					<ul class="space-y-3 text-sm text-slate-600">
						<li class="flex items-start gap-2">
							<span class="text-indigo-500 mt-1">•</span>
							<span>YouBike stations: {convenienceData.youbikeStations} ({convenienceData.nearestYoubikeDistance}m to nearest)</span>
						</li>
						{#if convenienceData.trashCollectionPoints > 0}
							<li class="flex items-start gap-2">
								<span class="text-indigo-500 mt-1">•</span>
								<span>Trash collection points: {convenienceData.trashCollectionPoints}</span>
							</li>
						{/if}
						{#if convenienceData.waterPoints > 0}
							<li class="flex items-start gap-2">
								<span class="text-indigo-500 mt-1">•</span>
								<span>Water points: {convenienceData.waterPoints}</span>
							</li>
						{/if}
						<li class="flex items-start gap-2">
							<span class="text-indigo-500 mt-1">•</span>
							<span>Public transport score: {Math.round(convenienceData.publicTransportScore)}/100</span>
						</li>
					</ul>
				</section>
			{/if}

		</div>
	</div>
	
	<!-- Floating Action Bar -->
	<div class="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none">
		<div class="bg-white/80 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border border-slate-200/50 rounded-2xl p-3 flex items-center justify-between pointer-events-auto max-w-2xl mx-auto gap-4">
			<!-- Secondary Action: Share -->
			<button class="btn btn-ghost btn-square text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" aria-label={m.report_share_button()}>
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
					<path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
				</svg>
			</button>

			<!-- Primary Action: Save Report -->
			<button class="btn bg-emerald-700 hover:bg-emerald-800 text-white border-none shadow-lg shadow-emerald-700/20 px-6 rounded-xl flex-1 max-w-xs flex items-center gap-2 normal-case font-bold text-base transition-transform active:scale-95">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
				</svg>
				Save Report
			</button>
		</div>
	</div>
{:else}
	<!-- Teaser Results View (Mobile First) -->
	<div class="min-h-screen bg-slate-50 pb-32">
		<!-- Top Bar -->
		<div class="fixed top-4 left-4 right-4 z-40 pointer-events-none">
			<div class="bg-white/90 backdrop-blur-xl shadow-sm border border-slate-200/50 rounded-full px-2 py-2 flex items-center gap-3 pointer-events-auto max-w-2xl mx-auto">
				<button onclick={() => scoreData = null} class="btn btn-circle btn-sm btn-ghost hover:bg-slate-100 text-slate-500 transition-colors" aria-label={m.teaser_back()}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
					</svg>
				</button>
				<div class="flex-1 font-bold text-slate-800 truncate text-sm leading-tight pr-4">
					{scoreData.address}
				</div>
			</div>
		</div>

		<div class="px-4 py-3 bg-slate-50 relative z-10 pt-20">
			<div class="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5 border border-slate-100">
				<!-- Left: Ring Progress -->
				<div class="relative flex-shrink-0">
					<div class="radial-progress {getProgressClass(scoreData.scores.overall)}" style="--value: {scoreData.scores.overall}; --size: 5rem; --thickness: 0.5rem; color: currentColor;">
						<span class="text-2xl font-bold text-slate-800 tracking-tight">
							{Math.round(scoreData.scores.overall)}
						</span>
					</div>
				</div>
				
				<!-- Right: Verdict & Summary -->
				<div class="flex-1 min-w-0">
					<h2 class="text-xl font-bold text-slate-800 leading-tight mb-1">
						{getScoreLabel(scoreData.scores.overall)}
					</h2>
					<p class="text-sm text-slate-500 leading-snug line-clamp-2">
						{getTeaserSummary(scoreData)}
					</p>
				</div>
			</div>
		</div>

		<!-- Map Placeholder/Preview -->
		<div class="h-[40vh] min-h-[300px] w-full bg-slate-100 relative z-0">
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
			<!-- Gradient Overlay to blend map into content if desired, or keep sharp -->
		</div>

		<div class="px-4 -mt-6 relative z-10 space-y-6">
			<!-- Details Grid (Partially Blurred) -->
			<div class="grid grid-cols-2 gap-3">
				<!-- Card 1: Noise (Free) -->
				<div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2">
					<div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
						</svg>
					</div>
					<h3 class="font-bold text-slate-800">{m.teaser_noise_card_title()}</h3>
					<div class="text-2xl font-bold text-emerald-700">{Math.round(scoreData.scores.noise)}/100</div>
					<p class="text-xs text-slate-400">{m.teaser_noise_card_desc()}</p>
				</div>

				<!-- Card 2: Air Quality (Free - showing real data) -->
				<div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2">
					<div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
						</svg>
					</div>
					<h3 class="font-bold text-slate-800">{m.air_quality()}</h3>
					<div class="text-2xl font-bold {getScoreColor(scoreData.scores.airQuality)}">{Math.round(scoreData.scores.airQuality)}/100</div>
					<p class="text-xs text-slate-400">{getScoreLabel(scoreData.scores.airQuality)}</p>
				</div>

				<!-- Card 3: Safety (Locked) -->
				<button class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2 relative overflow-hidden group cursor-pointer w-full" onclick={getPremiumReport}>
					<div class="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-100">
						<div class="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center mb-2 shadow-lg">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
								<path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd" />
							</svg>
						</div>
						<span class="text-xs font-bold text-slate-900 uppercase tracking-wider">{m.teaser_card_locked_view()}</span>
					</div>
					<div class="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-1 blur-sm">
						<!-- Icon -->
					</div>
					<h3 class="font-bold text-slate-800">{m.safety()}</h3>
					<div class="text-2xl font-bold text-slate-200 blur-sm">92/100</div>
					<p class="text-xs text-slate-400 blur-sm">Very Safe</p>
				</button>

				<!-- Card 4: Convenience (Locked) -->
				<button class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2 relative overflow-hidden group cursor-pointer w-full" onclick={getPremiumReport}>
					<div class="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center opacity-100">
						<div class="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center mb-2 shadow-lg">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
								<path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd" />
							</svg>
						</div>
						<span class="text-xs font-bold text-slate-900 uppercase tracking-wider">{m.teaser_card_locked_view()}</span>
					</div>
					<div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 blur-sm">
						<!-- Icon -->
					</div>
					<h3 class="font-bold text-slate-800">{m.convenience()}</h3>
					<div class="text-2xl font-bold text-slate-200 blur-sm">65/100</div>
					<p class="text-xs text-slate-400 blur-sm">Good</p>
				</button>
			</div>
		</div>

		<!-- Sticky Footer CTA -->
		<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-8 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
			<button 
				onclick={getPremiumReport}
				class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-700/20 active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-1"
			>
				<span class="text-lg">{m.teaser_unlock_button()}</span>
				<span class="text-[10px] font-normal opacity-80 uppercase tracking-wide">{m.teaser_unlock_subtext()}</span>
			</button>
		</div>
	</div>
{/if}

<style>
	:global(.leaflet-container) {
		font-family: inherit;
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
