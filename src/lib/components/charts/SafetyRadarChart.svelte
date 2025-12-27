<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ChartJS } from './chart-config';
	import type { ChartConfiguration } from 'chart.js';

	let { 
		safetyData
	}: {
		safetyData: {
			pedestrianSafety: number;
			crimeRate: number;
			accidentHotspots: number;
		};
	} = $props();

	let canvasElement: HTMLCanvasElement;
	let chartInstance: ChartJS | null = null;

	// Generate safety metrics based on safetyData
	const generateSafetyMetrics = (data: typeof safetyData) => {
		// Labels: Cambriolage, Accidents, Vandalisme, Éclairage public, Police
		const labels = ['Cambriolage', 'Accidents', 'Vandalisme', 'Éclairage public', 'Police'];
		
		// Dataset 1: Ce Quartier (based on actual safety data)
		// Higher values = better safety (inverse logic for some metrics)
		const quartierData = [
			Math.max(0, Math.min(100, (1 - data.crimeRate) * 100)), // Cambriolage (inverse of crime rate)
			Math.max(0, Math.min(100, data.pedestrianSafety)), // Accidents (pedestrian safety)
			Math.max(0, Math.min(100, (1 - data.crimeRate) * 90)), // Vandalisme (related to crime)
			Math.max(0, Math.min(100, 70 + (data.pedestrianSafety - 50) * 0.6)), // Éclairage public (estimated)
			Math.max(0, Math.min(100, 60 + (data.pedestrianSafety - 50) * 0.8)) // Police (estimated based on safety)
		];

		// Dataset 2: Moyenne Taipei (mock average values)
		const moyenneTaipei = [65, 70, 68, 75, 72];

		return { labels, quartierData, moyenneTaipei };
	};

	onMount(() => {
		if (!canvasElement) return;

		// Get context with willReadFrequently for better performance with getImageData
		const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		const { labels, quartierData, moyenneTaipei } = generateSafetyMetrics(safetyData);

		const config: ChartConfiguration<'radar'> = {
			type: 'radar',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Ce lieu',
						data: quartierData,
						backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald-500 with 0.2 opacity
						borderColor: '#10b981', // Emerald-500
						borderWidth: 2,
						pointBackgroundColor: '#10b981',
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#10b981',
						pointHoverBorderColor: '#fff',
						pointRadius: 4,
						pointHoverRadius: 6
					},
					{
						label: 'Moyenne Ville',
						data: moyenneTaipei,
						backgroundColor: 'rgba(203, 213, 225, 0.2)', // Slate-300 with 0.2 opacity
						borderColor: '#cbd5e1', // Slate-300
						borderWidth: 2,
						pointBackgroundColor: '#cbd5e1',
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#cbd5e1',
						pointHoverBorderColor: '#fff',
						pointRadius: 4,
						pointHoverRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'top',
						labels: {
							font: {
								family: 'Inter, system-ui, -apple-system, sans-serif',
								size: 12,
								weight: 500
							},
							color: '#64748b',
							padding: 15,
							usePointStyle: true,
							pointStyle: 'circle'
						}
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
							label: (context) => `${context.dataset.label}: ${context.parsed.r.toFixed(0)}/100`
						}
					}
				},
				scales: {
					r: {
						beginAtZero: true,
						min: 0,
						max: 100,
						ticks: {
							display: false, // Supprime les labels de l'axe radial (0-100)
							stepSize: 20
						},
						grid: {
							color: 'rgba(100, 116, 139, 0.1)', // Slate-500 with low opacity
							lineWidth: 1
						},
						pointLabels: {
							font: {
								family: 'Inter, system-ui, -apple-system, sans-serif',
								size: 11,
								weight: 500
							},
							color: '#64748b' // Slate-500
						},
						angleLines: {
							color: 'rgba(100, 116, 139, 0.1)' // Slate-500 with low opacity
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

	// Update chart when safetyData changes
	$effect(() => {
		if (chartInstance && canvasElement) {
			const { labels, quartierData, moyenneTaipei } = generateSafetyMetrics(safetyData);
			chartInstance.data.labels = labels;
			chartInstance.data.datasets[0].data = quartierData;
			chartInstance.data.datasets[1].data = moyenneTaipei;
			chartInstance.update('none');
		}
	});
</script>

<div class="h-64 w-full">
	<canvas bind:this={canvasElement}></canvas>
</div>

