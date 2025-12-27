<script lang="ts">
	import { getLocale, setLocale, locales, localizeHref, deLocalizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';

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

<div class="dropdown dropdown-end">
	<label tabindex="0" class="btn btn-ghost btn-sm gap-2">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-5 w-5"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
			/>
		</svg>
		<span class="hidden sm:inline">{m.language_switch()}</span>
		<span class="sm:hidden">{currentLocale.toUpperCase()}</span>
	</label>
	<ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg">
		{#each locales as locale}
			<li>
				<button
					onclick={() => switchLanguage(locale)}
					class="btn btn-ghost btn-sm justify-start {currentLocale === locale ? 'btn-active' : ''}"
				>
					{getLocaleName(locale)}
					{#if currentLocale === locale}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 ml-auto"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
</div>

