<script lang="ts">
	import { Volume2, Wind, Shield } from 'lucide-svelte';

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
		class="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-lg border backdrop-blur-md
		{noiseVisible 
			? 'bg-orange-500 text-white border-orange-600' 
			: 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'}"
		aria-label="Toggle noise layer"
	>
		<Volume2 class="w-4 h-4" strokeWidth={noiseVisible ? 2 : 1.5} />
		<span class="text-xs font-semibold">Noise</span>
	</button>

	<!-- Air Quality Toggle -->
	<button
		onclick={() => onAirQualityChange(!airQualityVisible)}
		class="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-lg border backdrop-blur-md
		{airQualityVisible 
			? 'bg-emerald-500 text-white border-emerald-600' 
			: 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'}"
		aria-label="Toggle air quality layer"
	>
		<Wind class="w-4 h-4" strokeWidth={airQualityVisible ? 2 : 1.5} />
		<span class="text-xs font-semibold">Air</span>
	</button>

	<!-- Safety Toggle -->
	<button
		onclick={() => onSafetyPointsChange(!safetyPointsVisible)}
		class="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 shadow-lg border backdrop-blur-md
		{safetyPointsVisible 
			? 'bg-blue-500 text-white border-blue-600' 
			: 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'}"
		aria-label="Toggle safety layer"
	>
		<Shield class="w-4 h-4" strokeWidth={safetyPointsVisible ? 2 : 1.5} />
		<span class="text-xs font-semibold">Safety</span>
	</button>
</div>

