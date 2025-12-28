import type { RequestHandler } from './$types';

/**
 * Dynamic sitemap generator for SEO
 * Follows SvelteKit best practices for sitemap generation
 */
export const GET: RequestHandler = async ({ url }) => {
	const baseUrl = url.origin;

	// Define all static routes
	const routes = [
		{
			url: baseUrl,
			changefreq: 'daily',
			priority: '1.0'
		},
		{
			url: `${baseUrl}/about`,
			changefreq: 'monthly',
			priority: '0.8'
		},
		{
			url: `${baseUrl}/sources`,
			changefreq: 'monthly',
			priority: '0.7'
		},
		{
			url: `${baseUrl}/legal`,
			changefreq: 'monthly',
			priority: '0.5'
		}
	];

	// Generate sitemap XML
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
	.map(
		(route) => `  <url>
    <loc>${route.url}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
		}
	});
};

