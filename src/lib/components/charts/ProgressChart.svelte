<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ChartJS } from './chart-config';
	import type { ChartConfiguration } from 'chart.js';

	let { 
		value = 0,
		min = 0,
		max = 100,
		label = '',
		color = '#10b981', // emerald-500 default
		showLabels = true,
		leftLabel = '',
		rightLabel = ''
	}: {
		value: number;
		min?: number;
		max?: number;
		label?: string;
		color?: string;
		showLabels?: boolean;
		leftLabel?: string;
		rightLabel?: string;
	} = $props();

	let canvasElement: HTMLCanvasElement;
	let chartInstance: ChartJS | null = null;

	onMount(() => {
		if (!canvasElement) return;

		const config: ChartConfiguration<'bar'> = {
			type: 'bar',
			data: {
				labels: [label || ''],
				datasets: [
					{
						label: '',
						data: [value],
						backgroundColor: color,
						borderColor: color,
						borderWidth: 0,
						borderRadius: 6,
						barThickness: 12
					}
				]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						enabled: false
					}
				},
				scales: {
					x: {
						min: min,
						max: max,
						display: false,
						grid: {
							display: false
						},
						ticks: {
							display: false
						}
					},
					y: {
						display: false,
						grid: {
							display: false
						},
						ticks: {
							display: false
						}
					}
				}
			}
		};

		chartInstance = new ChartJS(canvasElement, config);
	});

	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	});

	// Update chart when value changes
	$effect(() => {
		if (chartInstance && canvasElement) {
			chartInstance.data.datasets[0].data = [value];
			chartInstance.data.datasets[0].backgroundColor = color;
			chartInstance.data.datasets[0].borderColor = color;
			chartInstance.update('none');
		}
	});
</script>

<div class="space-y-1">
	<div class="h-3 w-full">
		<canvas bind:this={canvasElement}></canvas>
	</div>
	{#if showLabels && (leftLabel || rightLabel)}
		<div class="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
			<span>{leftLabel}</span>
			<span>{rightLabel}</span>
		</div>
	{/if}
</div>

