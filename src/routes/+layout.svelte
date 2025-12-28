<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import posthog from 'posthog-js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	let { children } = $props();

	// Make locale reactive
	let currentLocale = $state(getLocale());

	// Update locale when navigation happens
	afterNavigate(() => {
		currentLocale = getLocale();
	});

	// Also watch for locale changes
	$effect(() => {
		currentLocale = getLocale();
	});

	// Track pageview and pageleave events with PostHog
	if (browser) {
		beforeNavigate(() => posthog.capture('$pageleave'));
		afterNavigate(() => posthog.capture('$pageview'));
	}
</script>

<div
	class="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] antialiased selection:bg-[#007AFF] selection:text-white"
>
	<!-- Use locale as key to force re-render when locale changes -->
	{#key currentLocale}
		{@render children()}
	{/key}
</div>

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
