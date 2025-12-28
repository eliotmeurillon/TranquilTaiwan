import type { Page } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages';

export interface SEOData {
	title: string;
	description: string;
	image?: string;
	url?: string;
	type?: 'website' | 'article';
	noindex?: boolean;
}

/**
 * Generate canonical URL from page URL
 */
export function getCanonicalUrl(page: Page): string {
	const url = new URL(page.url);
	// Remove share parameter and other tracking params for canonical
	url.searchParams.delete('share');
	url.searchParams.delete('utm_source');
	url.searchParams.delete('utm_medium');
	url.searchParams.delete('utm_campaign');
	return url.toString();
}

/**
 * Generate full SEO meta tags object
 */
export function generateSEO(data: SEOData, page: Page): {
	title: string;
	description: string;
	canonical: string;
	og: {
		title: string;
		description: string;
		url: string;
		image: string;
		type: string;
		siteName: string;
	};
	twitter: {
		card: string;
		title: string;
		description: string;
		image: string;
	};
	line: {
		image: string;
		description: string;
	};
	robots: string;
} {
	const baseUrl = page.url.origin;
	const canonical = getCanonicalUrl(page);
	const title = data.title || m.app_title();
	const description = data.description || m.landing_subtitle();
	const image = data.image || `${baseUrl}/logo.png`;
	const url = data.url || canonical;

	return {
		title,
		description,
		canonical,
		og: {
			title,
			description,
			url,
			image,
			type: data.type || 'website',
			siteName: m.app_title()
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			image
		},
		line: {
			image,
			description
		},
		robots: data.noindex ? 'noindex, nofollow' : 'index, follow'
	};
}

