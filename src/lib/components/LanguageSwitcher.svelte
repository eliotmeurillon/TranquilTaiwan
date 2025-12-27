<script lang="ts">
	import { getLocale, setLocale, locales, localizeHref, deLocalizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { Globe, Check } from 'lucide-svelte';
	
	// Shadcn Components
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { Button } from "$lib/components/ui/button";

	// Make locale reactive
	let currentLocale = $state(getLocale());
	
	// Watch for locale changes
	$effect(() => {
		currentLocale = getLocale();
	});

	function getLocaleName(locale: string): string {
		if (locale === 'en') return m.language_english();
		if (locale === 'zh-tw') return m.language_traditional_chinese();
		return locale;
	}

	async function switchLanguage(newLocale: 'en' | 'zh-tw') {
		const current = getLocale();
		if (newLocale === current) return;

		// Get the current path without locale prefix
		const basePath = deLocalizeHref(page.url.pathname);
		// Localize it with the new locale
		const localizedPath = localizeHref(basePath, { locale: newLocale });

		// Set locale without reload
		setLocale(newLocale, { reload: false });
		
		// Navigate to the new URL
		await goto(localizedPath, { invalidateAll: true, noScroll: true });
		
		// Force invalidation to ensure all components re-render
		await invalidateAll();
		
		// Update reactive state
		currentLocale = getLocale();
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="h-9 w-9 rounded-full bg-white/70 backdrop-blur-md shadow-sm hover:bg-white text-slate-600 inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
		<Globe class="h-5 w-5" strokeWidth={1.5} />
		<span class="sr-only">{m.language_switch()}</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-[150px]">
		{#each locales as locale}
			<DropdownMenu.Item 
				onclick={() => switchLanguage(locale)}
				class="justify-between cursor-pointer"
			>
				{getLocaleName(locale)}
				{#if currentLocale === locale}
					<Check class="h-4 w-4 text-emerald-600" />
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
