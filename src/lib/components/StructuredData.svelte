<script lang="ts">
	import type { SEOData } from '$lib/utils/seo';

	interface Props {
		seoData: SEOData;
		type?: 'WebSite' | 'WebPage' | 'Article';
		url: string;
	}

	let { seoData, type = 'WebSite', url }: Props = $props();

	// Generate JSON-LD structured data
	const structuredData = $derived.by(() => {
		const data: any = {
			'@context': 'https://schema.org',
			'@type': type,
			name: seoData.title,
			description: seoData.description,
			url: url
		};

		if (seoData.image) {
			data.image = seoData.image;
		}

		if (type === 'WebSite') {
			data.potentialAction = {
				'@type': 'SearchAction',
				target: {
					'@type': 'EntryPoint',
					urlTemplate: `${url}?address={search_term_string}`
				},
				'query-input': 'required name=search_term_string'
			};
		}

		return data;
	});
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`}
</svelte:head>

