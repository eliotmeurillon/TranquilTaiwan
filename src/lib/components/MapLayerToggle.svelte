<script lang="ts">
	import { Volume2, Wind, Shield } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		noiseVisible: boolean;
		airQualityVisible: boolean;
		safetyPointsVisible: boolean;
		onNoiseChange: (visible: boolean) => void;
		onAirQualityChange: (visible: boolean) => void;
		onSafetyPointsChange: (visible: boolean) => void;
	}

	let {
		noiseVisible,
		airQualityVisible,
		safetyPointsVisible,
		onNoiseChange,
		onAirQualityChange,
		onSafetyPointsChange
	}: Props = $props();
</script>

<div class="absolute top-24 right-4 z-[400] flex flex-col gap-2 pointer-events-auto">
	<!-- Noise Toggle -->
	<button
		onclick={() => onNoiseChange(!noiseVisible)}
		class="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 backdrop-blur-xl border
		{noiseVisible 
			? 'bg-[#FF9500] text-white border-transparent' 
			: 'bg-[rgba(255,255,255,0.8)] text-[#1D1D1F] border-[rgba(0,0,0,0.08)] hover:bg-[rgba(255,255,255,0.9)]'}"
		aria-label={m.map_heatmap_toggle_noise()}
	>
		<Volume2 class="w-4 h-4" strokeWidth={noiseVisible ? 2 : 1.5} />
		<span class="text-xs font-semibold">{m.toggle_noise()}</span>
	</button>

	<!-- Air Quality Toggle -->
	<button
		onclick={() => onAirQualityChange(!airQualityVisible)}
		class="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 backdrop-blur-xl border
		{airQualityVisible 
			? 'bg-[#34C759] text-white border-transparent' 
			: 'bg-[rgba(255,255,255,0.8)] text-[#1D1D1F] border-[rgba(0,0,0,0.08)] hover:bg-[rgba(255,255,255,0.9)]'}"
		aria-label={m.map_heatmap_toggle_air()}
	>
		<Wind class="w-4 h-4" strokeWidth={airQualityVisible ? 2 : 1.5} />
		<span class="text-xs font-semibold">{m.toggle_air()}</span>
	</button>

	<!-- Safety Toggle -->
	<button
		onclick={() => onSafetyPointsChange(!safetyPointsVisible)}
		class="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 backdrop-blur-xl border
		{safetyPointsVisible 
			? 'bg-[#007AFF] text-white border-transparent' 
			: 'bg-[rgba(255,255,255,0.8)] text-[#1D1D1F] border-[rgba(0,0,0,0.08)] hover:bg-[rgba(255,255,255,0.9)]'}"
		aria-label="Toggle safety layer"
	>
		<Shield class="w-4 h-4" strokeWidth={safetyPointsVisible ? 2 : 1.5} />
		<span class="text-xs font-semibold">{m.toggle_safety()}</span>
	</button>
</div>
