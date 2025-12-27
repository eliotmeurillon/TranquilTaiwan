<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { getLocale } from '$lib/paraglide/runtime';
	import LeafletMap from '$lib/components/LeafletMap.svelte';
	import * as m from '$lib/paraglide/messages';

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

	async function searchAddress() {
		if (!browser) return;
		
		if (!address.trim()) {
			error = m.error_please_enter_address();
			return;
		}

		loading = true;
		error = null;
		scoreData = null;

		try {
			const response = await fetch(`/api/score?address=${encodeURIComponent(address)}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || m.error_failed_calculate());
			}

			const data = await response.json();
			scoreData = data;
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
		} catch (err) {
			error = err instanceof Error ? err.message : m.error_occurred();
		} finally {
			loading = false;
		}
	}

	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-success';
		if (score >= 60) return 'text-warning';
		return 'text-error';
	}

	function getScoreBadge(score: number): string {
		if (score >= 80) return 'badge-success';
		if (score >= 60) return 'badge-warning';
		return 'badge-error';
	}

	function getScoreLabel(score: number): string {
		if (score >= 80) return m.score_excellent();
		if (score >= 60) return m.score_good();
		if (score >= 40) return m.score_fair();
		return m.score_poor();
	}

	function getProgressColor(score: number): string {
		if (score >= 80) return 'progress-success';
		if (score >= 60) return 'progress-warning';
		return 'progress-error';
	}
</script>

<div class="min-h-screen bg-base-200">
	<div class="container mx-auto px-4 py-8 max-w-6xl">
		<!-- Hero Section -->
		<div class="hero bg-base-100 rounded-3xl shadow-2xl mb-8">
			<div class="hero-content text-center py-12">
				<div class="max-w-md">
					<h1 class="text-6xl font-bold mb-4">
						{m.app_title()}
					</h1>
					<p class="text-3xl font-semibold mb-2">TranquilTaiwan</p>
					<p class="text-lg text-base-content/70">
						{m.app_subtitle()}
					</p>
				</div>
			</div>
		</div>

		<!-- Search Section -->
		<div class="card bg-base-100 shadow-xl mb-8">
			<div class="card-body">
				<div class="form-control">
					<div class="input-group">
						<input
							type="text"
							bind:value={address}
							placeholder={m.search_placeholder()}
							class="input input-bordered input-lg w-full"
							onkeydown={(e) => e.key === 'Enter' && searchAddress()}
						/>
						<button
							onclick={searchAddress}
							disabled={loading}
							class="btn btn-primary btn-lg"
						>
							{#if loading}
								<span class="loading loading-spinner"></span>
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							{/if}
							{#if loading}
								{m.calculating()}
							{:else}
								{m.search_button()}
							{/if}
						</button>
					</div>
				</div>
				
				{#if error}
					<div class="alert alert-error mt-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>{error}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Results Section -->
		{#if scoreData}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<!-- Overall Score Card -->
					<div class="mb-8">
						<h2 class="card-title text-3xl mb-6">{m.livability_score()}</h2>
						<div class="flex flex-col md:flex-row items-center gap-6">
							<div class="stat bg-base-200 rounded-2xl px-8 py-6">
								<div class="stat-figure {getScoreColor(scoreData.scores.overall)}">
									<div class="radial-progress {getProgressColor(scoreData.scores.overall)}" style="--value: {scoreData.scores.overall}; --size: 8rem;">
										<span class="text-4xl font-bold">{Math.round(scoreData.scores.overall)}</span>
									</div>
								</div>
								<div class="stat-title">{m.overall_score()}</div>
								<div class="stat-value {getScoreColor(scoreData.scores.overall)}">{Math.round(scoreData.scores.overall)}</div>
								<div class="stat-desc">
									<span class="badge {getScoreBadge(scoreData.scores.overall)} badge-lg">
										{getScoreLabel(scoreData.scores.overall)}
									</span>
								</div>
							</div>
							<div class="flex-1">
								<p class="text-xl font-semibold mb-2">
									{scoreData.address}
								</p>
								<p class="text-base-content/70 mb-4">
									{m.coordinates()}: {scoreData.coordinates.latitude.toFixed(4)}, {scoreData.coordinates.longitude.toFixed(4)}
								</p>
							</div>
						</div>
					</div>

					<!-- Map Section -->
					<div class="mb-8">
						<h3 class="card-title text-2xl mb-4">{m.location_map()}</h3>
						<div class="w-full h-96 rounded-lg overflow-hidden border border-base-300">
							<LeafletMap
								latitude={scoreData.coordinates.latitude}
								longitude={scoreData.coordinates.longitude}
								address={scoreData.address}
								noiseScore={scoreData.scores.noise}
								airQualityScore={scoreData.scores.airQuality}
								zoom={15}
							/>
						</div>
						<p class="text-sm text-base-content/70 mt-2">
							{m.map_heatmap_description()}
						</p>
					</div>

					<!-- Score Breakdown -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
						<!-- Noise Score -->
						<div class="card bg-base-200 shadow">
							<div class="card-body">
								<div class="flex items-center justify-between mb-2">
									<h3 class="card-title text-lg">{m.noise_score()}</h3>
									<span class="text-2xl font-bold {getScoreColor(scoreData.scores.noise)}">
										{Math.round(scoreData.scores.noise)}
									</span>
								</div>
								<p class="text-sm text-base-content/70 mb-3">
									{m.noise_score_description()}
								</p>
								<progress 
									class="progress {getProgressColor(scoreData.scores.noise)}" 
									value={scoreData.scores.noise} 
									max="100"
								></progress>
							</div>
						</div>

						<!-- Air Quality Score -->
						<div class="card bg-base-200 shadow">
							<div class="card-body">
								<div class="flex items-center justify-between mb-2">
									<h3 class="card-title text-lg">{m.air_quality()}</h3>
									<span class="text-2xl font-bold {getScoreColor(scoreData.scores.airQuality)}">
										{Math.round(scoreData.scores.airQuality)}
									</span>
								</div>
								<p class="text-sm text-base-content/70 mb-3">
									{m.air_quality_description()}
								</p>
								<progress 
									class="progress {getProgressColor(scoreData.scores.airQuality)}" 
									value={scoreData.scores.airQuality} 
									max="100"
								></progress>
							</div>
						</div>

						<!-- Safety Score -->
						<div class="card bg-base-200 shadow">
							<div class="card-body">
								<div class="flex items-center justify-between mb-2">
									<h3 class="card-title text-lg">{m.safety()}</h3>
									<span class="text-2xl font-bold {getScoreColor(scoreData.scores.safety)}">
										{Math.round(scoreData.scores.safety)}
									</span>
								</div>
								<p class="text-sm text-base-content/70 mb-3">
									{m.safety_description()}
								</p>
								<progress 
									class="progress {getProgressColor(scoreData.scores.safety)}" 
									value={scoreData.scores.safety} 
									max="100"
								></progress>
							</div>
						</div>

						<!-- Convenience Score -->
						<div class="card bg-base-200 shadow">
							<div class="card-body">
								<div class="flex items-center justify-between mb-2">
									<h3 class="card-title text-lg">{m.convenience()}</h3>
									<span class="text-2xl font-bold {getScoreColor(scoreData.scores.convenience)}">
										{Math.round(scoreData.scores.convenience)}
									</span>
								</div>
								<p class="text-sm text-base-content/70 mb-3">
									{m.convenience_description()}
								</p>
								<progress 
									class="progress {getProgressColor(scoreData.scores.convenience)}" 
									value={scoreData.scores.convenience} 
									max="100"
								></progress>
							</div>
						</div>

						<!-- Zoning Risk Score -->
						<div class="card bg-base-200 shadow">
							<div class="card-body">
								<div class="flex items-center justify-between mb-2">
									<h3 class="card-title text-lg">{m.zoning_risk()}</h3>
									<span class="text-2xl font-bold {getScoreColor(scoreData.scores.zoningRisk)}">
										{Math.round(scoreData.scores.zoningRisk)}
									</span>
								</div>
								<p class="text-sm text-base-content/70 mb-3">
									{m.zoning_risk_description()}
								</p>
								<progress 
									class="progress {getProgressColor(scoreData.scores.zoningRisk)}" 
									value={scoreData.scores.zoningRisk} 
									max="100"
								></progress>
							</div>
						</div>
					</div>

					<!-- Premium Report Section -->
					{#if !showPremium && !scoreData.premium}
						<div class="divider"></div>
						<div class="alert alert-info shadow-lg">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
							<div class="flex-1">
								<h3 class="font-bold text-lg mb-2">{m.premium_report_title()}</h3>
								<p class="text-sm">
									{m.premium_report_description()}
								</p>
							</div>
							<button
								onclick={getPremiumReport}
								disabled={loading}
								class="btn btn-primary"
							>
								{#if loading}
									<span class="loading loading-spinner"></span>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
								{/if}
								{#if loading}
									{m.loading()}
								{:else}
									{m.view_premium_report()}
								{/if}
							</button>
						</div>
					{/if}

					<!-- Premium Report Details -->
					{#if showPremium && scoreData.detailedData}
						<div class="divider"></div>
						<h3 class="card-title text-2xl mb-4">{m.detailed_report()}</h3>
						<div class="space-y-4">
							<div class="collapse collapse-plus bg-base-200">
								<input type="checkbox" />
								<div class="collapse-title text-xl font-medium">
									{m.noise_data()}
								</div>
								<div class="collapse-content">
									<pre class="text-sm overflow-x-auto bg-base-300 p-4 rounded">{JSON.stringify(scoreData.detailedData.noise, null, 2)}</pre>
								</div>
							</div>
							<div class="collapse collapse-plus bg-base-200">
								<input type="checkbox" />
								<div class="collapse-title text-xl font-medium">
									{m.air_quality_data()}
								</div>
								<div class="collapse-content">
									<pre class="text-sm overflow-x-auto bg-base-300 p-4 rounded">{JSON.stringify(scoreData.detailedData.airQuality, null, 2)}</pre>
								</div>
							</div>
							<div class="collapse collapse-plus bg-base-200">
								<input type="checkbox" />
								<div class="collapse-title text-xl font-medium">
									{m.safety_data()}
								</div>
								<div class="collapse-content">
									<pre class="text-sm overflow-x-auto bg-base-300 p-4 rounded">{JSON.stringify(scoreData.detailedData.safety, null, 2)}</pre>
								</div>
							</div>
							<div class="collapse collapse-plus bg-base-200">
								<input type="checkbox" />
								<div class="collapse-title text-xl font-medium">
									{m.convenience_data()}
								</div>
								<div class="collapse-content">
									<pre class="text-sm overflow-x-auto bg-base-300 p-4 rounded">{JSON.stringify(scoreData.detailedData.convenience, null, 2)}</pre>
								</div>
							</div>
							<div class="collapse collapse-plus bg-base-200">
								<input type="checkbox" />
								<div class="collapse-title text-xl font-medium">
									{m.zoning_data()}
								</div>
								<div class="collapse-content">
									<pre class="text-sm overflow-x-auto bg-base-300 p-4 rounded">{JSON.stringify(scoreData.detailedData.zoning, null, 2)}</pre>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Info Section -->
		{#if !scoreData}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-3xl mb-6">{m.how_it_works()}</h2>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="card bg-base-200 shadow">
							<div class="card-body items-center text-center">
								<div class="text-5xl mb-4">🔍</div>
								<h3 class="card-title">{m.how_it_works_search()}</h3>
								<p class="text-base-content/70">
									{m.how_it_works_search_desc()}
								</p>
							</div>
						</div>
						<div class="card bg-base-200 shadow">
							<div class="card-body items-center text-center">
								<div class="text-5xl mb-4">📊</div>
								<h3 class="card-title">{m.how_it_works_scores()}</h3>
								<p class="text-base-content/70">
									{m.how_it_works_scores_desc()}
								</p>
							</div>
						</div>
						<div class="card bg-base-200 shadow">
							<div class="card-body items-center text-center">
								<div class="text-5xl mb-4">💎</div>
								<h3 class="card-title">{m.how_it_works_premium()}</h3>
								<p class="text-base-content/70">
									{m.how_it_works_premium_desc()}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
