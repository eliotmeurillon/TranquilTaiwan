import { getLocale as getParaglideLocale } from '$lib/paraglide/runtime';
import { writable } from 'svelte/store';

// Create a reactive store for the locale
export const locale = writable(getParaglideLocale());

// Update the store when locale changes
export function updateLocale() {
	locale.set(getParaglideLocale());
}

