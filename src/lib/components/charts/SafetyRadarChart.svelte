<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ChartJS } from './chart-config';
	import type { ChartConfiguration } from 'chart.js';
	import * as m from '$lib/paraglide/messages';

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
		const labels = [
			m.chart_radar_burglary(), 
			m.chart_radar_accidents(), 
			m.chart_radar_vandalism(), 
			m.chart_radar_lighting(), 
			m.chart_radar_police()
		];
		
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
						label: m.chart_radar_this_place(),
						data: quartierData,
						backgroundColor: 'rgba(52, 199, 89, 0.2)', // System Green with 0.2 opacity
						borderColor: '#34C759', // System Green
						borderWidth: 2,
						pointBackgroundColor: '#34C759',
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#34C759',
						pointHoverBorderColor: '#fff',
						pointRadius: 4,
						pointHoverRadius: 6
					},
					{
						label: m.chart_radar_city_avg(),
						data: moyenneTaipei,
						backgroundColor: 'rgba(142, 142, 147, 0.2)', // System Gray with 0.2 opacity
						borderColor: '#8E8E93', // System Gray
						borderWidth: 2,
						pointBackgroundColor: '#8E8E93',
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#8E8E93',
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
								family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
								size: 12,
								weight: 500
							},
							color: '#86868B',
							padding: 15,
							usePointStyle: true,
							pointStyle: 'circle'
						}
					},
					tooltip: {
						enabled: true,
						backgroundColor: 'rgba(29, 29, 31, 0.8)',
						padding: 12,
						titleFont: {
							family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
							size: 12,
							weight: 600
						},
						bodyFont: {
							family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
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
							color: 'rgba(0, 0, 0, 0.05)', // Light separator
							lineWidth: 1
						},
						pointLabels: {
							font: {
								family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
								size: 11,
								weight: 500
							},
							color: '#86868B' // Tertiary Text
						},
						angleLines: {
							color: 'rgba(0, 0, 0, 0.05)'
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
