import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/geocode/suggestions?q=...
 * Get address suggestions from Nominatim for autocomplete
 */
export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	
	if (!query || query.trim().length < 2) {
		return json({ suggestions: [] });
	}

	try {
		// Normalize Taiwan address before querying for better results
		const { normalizeTaiwanAddress } = await import('$lib/server/services/addressNormalizer');
		const normalizedQuery = normalizeTaiwanAddress(query);
		
		// Use Nominatim search API with limit for autocomplete
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery)}&limit=5&addressdetails=1&countrycodes=tw&accept-language=zh-tw,en`,
			{
				headers: {
					'User-Agent': 'TranquilTaiwan/1.0'
				}
			}
		);

		if (!response.ok) {
			throw new Error(`Nominatim API failed: ${response.statusText}`);
		}

		const data = await response.json();
		
		// Format suggestions for autocomplete
		const suggestions = (data || []).map((item: any) => ({
			displayName: item.display_name,
			address: item.display_name,
			latitude: parseFloat(item.lat),
			longitude: parseFloat(item.lon),
			placeId: item.place_id,
			// Extract key components for better display
			components: {
				road: item.address?.road || '',
				houseNumber: item.address?.house_number || '',
				neighbourhood: item.address?.neighbourhood || item.address?.suburb || '',
				district: item.address?.city_district || item.address?.district || '',
				city: item.address?.city || item.address?.town || '',
				postcode: item.address?.postcode || ''
			}
		}));

		return json({ suggestions });
	} catch (error) {
		console.error('Geocoding suggestions error:', error);
		// Return empty suggestions on error (fallback)
		return json({ suggestions: [] });
	}
};

