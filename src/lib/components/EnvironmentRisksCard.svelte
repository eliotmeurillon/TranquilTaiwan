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
			? m.zoning_industrial()
			: zoningData?.adjacentHighIntensityCommercial 
				? m.zoning_commercial()
				: m.zoning_residential()
	);

	const aqiStyles = $derived(
		!airData ? { color: 'text-[#86868B]', label: m.status_unknown() } :
		airData.aqi <= 50 
			? { color: 'text-[#34C759]', label: m.score_good() }
			: airData.aqi <= 100 
				? { color: 'text-[#FF9500]', label: m.score_good() } // Using Moderate if available or mapping to Good/Fair
				: { color: 'text-[#FF3B30]', label: m.score_poor() }
	);
	
	// Refined AQI label logic to match new keys if needed, or stick to Good/Poor for simplicity
	// Actually I added teaser_noise_status_moderate but not a generic "Moderate" status key except inside that context. 
	// I added score_fair which is "Fair". Let's use that for moderate.
	const aqiLabel = $derived(
		!airData ? m.status_unknown() :
		airData.aqi <= 50 ? m.score_excellent() :
		airData.aqi <= 100 ? m.score_fair() :
		m.score_poor()
	);

</script>

<Card.Root class="h-full mb-6 md:mb-0">
	<Card.Header class="pb-4 relative">
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-full bg-[rgba(0,122,255,0.1)] text-[#007AFF] flex items-center justify-center">
					<Wind class="w-5 h-5" strokeWidth={1.5} />
				</div>
				<Card.Title>{m.report_env_title()}</Card.Title>
			</div>
			
			<div class="absolute top-6 right-6">
				<InfoHint 
					title={m.info_aqi_title()}
					description={m.info_aqi_desc()}
				/>
			</div>
		</div>

		{#if airData}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-semibold text-[#1D1D1F]">{m.aqi_index()}</p>
						<p class="text-xs text-[#86868B]">{aqiLabel}</p>
					</div>
					<div class="text-right">
						<span class="text-2xl font-bold {aqiStyles.color}">{airData.aqi}</span>
						<span class="text-sm text-[#86868B]">/500</span>
					</div>
				</div>
				<Progress value={Math.min((airData.aqi / 200) * 100, 100)} class="h-1.5" />
			</div>
		{:else}
			<p class="text-sm text-[#86868B]">{m.status_unknown()}</p>
		{/if}
	</Card.Header>

	<Card.Content class="space-y-4">
		{#if airData}
			<!-- PM2.5 -->
			<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#636366]">
						<Wind size={18} strokeWidth={1.5} />
					</div>
					<div>
						<p class="font-medium text-[#1D1D1F]">PM2.5</p>
						<p class="text-xs text-[#86868B]">{m.pm25_name()}</p>
					</div>
				</div>
				<div class="text-right">
					<span class="font-semibold text-[#1D1D1F]">{airData.pm25}</span>
					<span class="text-xs text-[#86868B] ml-1">µg/m³</span>
				</div>
			</div>

			<!-- Dengue -->
			<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#636366]">
						<Bug size={18} strokeWidth={1.5} />
					</div>
					<div>
						<p class="font-medium text-[#1D1D1F]">{m.dengue_risk()}</p>
						<p class="text-xs text-[#86868B]">{m.historical_data()}</p>
					</div>
				</div>
				<div class="text-right">
					{#if airData.dengueRisk}
						<Badge variant="destructive" class="px-2 py-0.5 h-6 text-[11px]">{m.status_risk()}</Badge>
					{:else}
						<Badge variant="success" class="px-2 py-0.5 h-6 text-[11px]">{m.status_safe()}</Badge>
					{/if}
				</div>
			</div>

			<!-- Zoning -->
			<div class="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.06)] last:border-0">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-[#F5F5F7] text-[#636366]">
						<Building size={18} strokeWidth={1.5} />
					</div>
					<div>
						<p class="font-medium text-[#1D1D1F]">{m.zoning_area()}</p>
						<p class="text-xs text-[#86868B]">{m.area_classification()}</p>
					</div>
				</div>
				<div class="text-right">
					<span class="text-sm font-medium text-[#1D1D1F] text-right truncate max-w-[120px]" title={zoningLabel}>
						{zoningLabel}
					</span>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
