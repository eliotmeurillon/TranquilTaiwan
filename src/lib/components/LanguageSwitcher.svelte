<script lang="ts">
	import { getLocale, setLocale, locales, localizeHref, deLocalizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { Globe, Check } from 'lucide-svelte';
	
	// Shadcn Components
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	
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
	<DropdownMenu.Trigger class="h-[40px] w-[40px] rounded-full bg-[rgba(255,255,255,0.72)] backdrop-blur-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[rgba(255,255,255,0.9)] text-[#1D1D1F] inline-flex items-center justify-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 border border-[rgba(0,0,0,0.08)]">
		<Globe class="h-5 w-5 opacity-70" strokeWidth={1.5} />
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
					<Check class="h-4 w-4 text-[#007AFF]" />
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
