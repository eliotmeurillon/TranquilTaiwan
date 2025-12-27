<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import { Button } from "$lib/components/ui/button";
	
	// Svelte 5 +error.svelte props are implicit or can be typed as follows if generated types fail
	let { error, status }: { error: any, status: number } = $props();
	
	// Extract error message
	let errorMessage = $derived(error?.message || error?.toString() || 'An unexpected error occurred');
	let errorStatus = $derived(status || (error as any)?.status || 500);
</script>

<svelte:head>
	<title>{errorStatus} - {m.app_title()}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<div class="mb-8">
			<div class="text-6xl font-bold text-slate-200 mb-4">{errorStatus}</div>
			<h1 class="text-2xl font-bold text-slate-800 mb-2">
				{errorStatus === 404 ? 'Page Not Found' : 'Something went wrong'}
			</h1>
			<p class="text-slate-600 mb-6">{errorMessage}</p>
		</div>
		
		<div class="space-y-4 flex flex-col items-center">
			<Button 
				href="/" 
				class="bg-emerald-700 hover:bg-emerald-800 text-white border-none px-6 rounded-xl"
			>
				Go Home
			</Button>
			
			{#if errorStatus === 500}
				<Button 
					variant="ghost"
					onclick={() => window.location.reload()} 
					class="text-slate-600 hover:text-slate-800"
				>
					Try Again
				</Button>
			{/if}
		</div>
		
		{#if error?.stack && import.meta.env.DEV}
			<details class="mt-8 text-left">
				<summary class="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
					Error Details (Development Only)
				</summary>
				<pre class="mt-4 p-4 bg-slate-100 rounded-lg text-xs overflow-auto max-h-64">
					{error.stack}
				</pre>
			</details>
		{/if}
	</div>
</div>
