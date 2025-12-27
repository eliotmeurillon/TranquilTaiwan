<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import Progress from "$lib/components/ui/progress/progress.svelte";
	import InfoHint from "$lib/components/InfoHint.svelte";
	import * as m from '$lib/paraglide/messages';
	import { Wind, Bug, Building } from "lucide-svelte";

	type AirQualityData = {
		pm25: number;
		aqi: number;
		dengueRisk: boolean;
		historicalDengueCases: number;
	};

	type ZoningData = {
		adjacentIndustrial: boolean;
		adjacentHighIntensityCommercial: boolean;
	};

	interface Props {
		detailedData?: {
			airQuality?: AirQualityData;
			zoning?: ZoningData;
		};
	}

	let { detailedData } = $props<Props>();

	const airData = $derived(detailedData?.airQuality);
	const zoningData = $derived(detailedData?.zoning);

	// Derived values
	const isIndus = $derived(zoningData?.adjacentIndustrial);
	const zoningLabel = $derived(
		isIndus 
			? 'Industrial Nearby' 
			: zoningData?.adjacentHighIntensityCommercial 
				? 'Commercial Area' 
				: m.zoning_residential()
	);

	const aqiStyles = $derived(
		!airData ? { color: 'text-slate-600', label: 'Unknown' } :
		airData.aqi <= 50 
			? { color: 'text-emerald-600', label: 'Good' }
			: airData.aqi <= 100 
				? { color: 'text-yellow-600', label: 'Moderate' }
				: { color: 'text-orange-600', label: 'Unhealthy' }
	);
</script>

<Card.Root class="h-full bg-white border-slate-100 shadow-md hover:shadow-lg transition-all duration-300 mb-6 md:mb-0">
	<Card.Header class="pb-4 relative">
		<div class="flex items-center justify-between mb-4">
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
		</div>

		{#if airData}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-semibold text-slate-700">Air Quality Index</p>
						<p class="text-xs text-slate-500">{aqiStyles.label}</p>
					</div>
					<div class="text-right">
						<span class="text-2xl font-bold {aqiStyles.color}">{airData.aqi}</span>
						<span class="text-sm text-slate-400">/500</span>
					</div>
				</div>
				<!-- Normalize AQI to 0-100 for progress bar (assuming max relevant AQI is around 200-300 usually, but scale is 500) -->
				<!-- Actually standard AQI: 0-50 Good, 51-100 Moderate, 101-150 Unhealthy for Sensitive, >150 Unhealthy -->
				<!-- Let's map it roughly: 0->0, 200->100? Or just use linear up to a cap -->
				<Progress value={Math.min((airData.aqi / 200) * 100, 100)} class="h-1.5" />
			</div>
		{:else}
			<p class="text-sm text-slate-500">Data not available</p>
		{/if}
	</Card.Header>

	<Card.Content class="space-y-4">
		{#if airData}
			<!-- PM2.5 -->
			<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-slate-50 text-slate-600">
						<Wind size={18} strokeWidth={1.5} />
					</div>
					<div>
						<p class="font-medium text-slate-900">PM2.5</p>
						<p class="text-xs text-slate-500">Fine Particulate Matter</p>
					</div>
				</div>
				<div class="text-right">
					<span class="font-semibold text-slate-700">{airData.pm25}</span>
					<span class="text-xs text-slate-400 ml-1">µg/m³</span>
				</div>
			</div>

			<!-- Dengue -->
			<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-slate-50 text-slate-600">
						<Bug size={18} strokeWidth={1.5} />
					</div>
					<div>
						<p class="font-medium text-slate-900">Dengue Risk</p>
						<p class="text-xs text-slate-500">Historical Data</p>
					</div>
				</div>
				<div class="text-right">
					{#if airData.dengueRisk}
						<Badge variant="destructive" class="text-[10px] px-2 py-0.5 h-6">Risk</Badge>
					{:else}
						<Badge variant="outline" class="text-[10px] px-2 py-0.5 h-6 bg-emerald-50 text-emerald-700 border-emerald-200">Safe</Badge>
					{/if}
				</div>
			</div>

			<!-- Zoning -->
			<div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-slate-50 text-slate-600">
						<Building size={18} strokeWidth={1.5} />
					</div>
					<div>
						<p class="font-medium text-slate-900">Zoning</p>
						<p class="text-xs text-slate-500">Area Classification</p>
					</div>
				</div>
				<div class="text-right">
					<span class="text-sm font-medium text-slate-700 text-right truncate max-w-[120px]" title={zoningLabel}>
						{zoningLabel}
					</span>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

