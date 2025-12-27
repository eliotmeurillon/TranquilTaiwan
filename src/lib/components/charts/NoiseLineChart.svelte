<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ChartJS } from './chart-config';
	import type { ChartConfiguration } from 'chart.js';

	let { 
		noiseLevel = 0 // Base noise level for generating mock data
	}: {
		noiseLevel?: number;
	} = $props();

	let canvasElement: HTMLCanvasElement;
	let chartInstance: ChartJS | null = null;

	// Generate mock data based on noise level
	const generateMockData = (baseLevel: number) => {
		// Hours: 00h, 04h, 08h, 12h, 16h, 20h, 24h
		const hours = ['00h', '04h', '08h', '12h', '16h', '20h', '24h'];
		
		// Generate realistic noise pattern:
		// - Quiet at night (00h, 04h): 30-40 dB
		// - Peak at morning rush (08h): baseLevel + 10-20
		// - Moderate during day (12h): baseLevel
		// - Peak at evening rush (16h, 20h): baseLevel + 15-25
		// - Quieter at night (24h): 35-45 dB
		const data = [
			Math.max(30, baseLevel - 30), // 00h - quiet night
			Math.max(35, baseLevel - 25), // 04h - early morning
			Math.min(90, baseLevel + 15), // 08h - morning rush
			baseLevel, // 12h - midday
			Math.min(90, baseLevel + 20), // 16h - afternoon rush
			Math.min(85, baseLevel + 18), // 20h - evening rush
			Math.max(35, baseLevel - 20)  // 24h - late night
		];

		return { hours, data };
	};

	// Find peak hour for dynamic message
	const getPeakHour = (data: number[], hours: string[]) => {
		const maxIndex = data.indexOf(Math.max(...data));
		return hours[maxIndex];
	};

	onMount(() => {
		if (!canvasElement) return;

		const { hours, data } = generateMockData(noiseLevel);
		const peakHour = getPeakHour(data, hours);

		// Create gradient for fill
		const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		const gradient = ctx.createLinearGradient(0, 0, 0, 192);
		gradient.addColorStop(0, 'rgba(249, 115, 22, 0.3)'); // orange-500 with opacity
		gradient.addColorStop(1, 'rgba(249, 115, 22, 0)'); // transparent

		const config: ChartConfiguration<'line'> = {
			type: 'line',
			data: {
				labels: hours,
				datasets: [
					{
						label: 'Niveau sonore (dB)',
						data: data,
						borderColor: '#f97316', // orange-500
						backgroundColor: gradient,
						borderWidth: 2,
						tension: 0.4, // Smooth curve
						fill: true,
						pointRadius: 4,
						pointBackgroundColor: '#f97316',
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
						pointHoverRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						enabled: true,
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						padding: 12,
						titleFont: {
							family: 'Inter, system-ui, -apple-system, sans-serif',
							size: 12,
							weight: 600
						},
						bodyFont: {
							family: 'Inter, system-ui, -apple-system, sans-serif',
							size: 14
						},
						callbacks: {
							label: (context) => {
								const value = context.parsed.y;
								return value !== null && value !== undefined ? `${value.toFixed(0)} dB` : '';
							}
						}
					}
				},
				scales: {
					x: {
						grid: {
							display: false // No vertical grid
						},
						ticks: {
							font: {
								family: 'Inter, system-ui, -apple-system, sans-serif',
								size: 11
							},
							color: '#64748b'
						}
					},
					y: {
						beginAtZero: false,
						min: 20,
						max: 100,
						grid: {
							display: true,
							color: 'rgba(100, 116, 139, 0.1)' // Slate-500 with low opacity
						},
						ticks: {
							font: {
								family: 'Inter, system-ui, -apple-system, sans-serif',
								size: 11
							},
							color: '#64748b',
							callback: (value) => `${value} dB`
						}
					}
				}
			}
		};

		// Use the context with willReadFrequently for better performance with getImageData
		chartInstance = new ChartJS(ctx, config);
	});

	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	});

	// Update chart when noiseLevel changes
	$effect(() => {
		if (chartInstance && canvasElement) {
			const { hours, data } = generateMockData(noiseLevel);
			chartInstance.data.labels = hours;
			chartInstance.data.datasets[0].data = data;
			
			// Recreate gradient for updated chart
			const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
			if (ctx) {
				const gradient = ctx.createLinearGradient(0, 0, 0, 192);
				gradient.addColorStop(0, 'rgba(249, 115, 22, 0.3)');
				gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
				chartInstance.data.datasets[0].backgroundColor = gradient;
			}
			
			chartInstance.update('none');
		}
	});

	// Generate reactive message based on current data
	const currentData = $derived(generateMockData(noiseLevel));
	const peakHour = $derived(getPeakHour(currentData.data, currentData.hours));
	const isQuietAfter22h = $derived(currentData.data[5] > currentData.data[6]); // 20h > 24h
	const message = $derived(
		`Pic de bruit à ${peakHour}${peakHour === '16h' || peakHour === '20h' ? ' (Sortie de bureaux)' : ''}. ${isQuietAfter22h ? 'Calme après 22h.' : ''}`
	);
</script>

<div class="space-y-3">
	<div class="h-48 w-full">
		<canvas bind:this={canvasElement}></canvas>
	</div>
	<div class="text-xs text-slate-500 font-medium px-1">
		{message}
	</div>
</div>

