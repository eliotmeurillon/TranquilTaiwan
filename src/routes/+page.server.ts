import type { PageServerLoad } from './$types';

/**
 * Server-side load function for the home page
 * Handles initial data loading for shared URLs and SSR
 */
export const load: PageServerLoad = async ({ url, fetch, setHeaders }) => {
	const address = url.searchParams.get('address');
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	const shareMode = url.searchParams.get('share') === 'true';

	// If coordinates provided, use them directly
	if (lat && lon) {
		try {
			const recalcResponse = await fetch('/api/score/recalculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ latitude: parseFloat(lat), longitude: parseFloat(lon) })
			});
			
			if (recalcResponse.ok) {
				const recalcData = await recalcResponse.json();
				const addressData = address ? await fetch(`/api/score?address=${encodeURIComponent(address)}`).then(r => r.ok ? r.json() : null) : null;
				
				const scoreData = {
					...(addressData || {}),
					address: address || `Lat: ${lat}, Lon: ${lon}`,
					coordinates: recalcData.coordinates,
					scores: recalcData.scores,
					detailedData: recalcData.detailedData,
					isApproximate: false
				};
				
				return { scoreData, address: address || scoreData.address, shareMode };
			}
		} catch (err) {
			console.error('Error loading score from coordinates:', err);
		}
	}

	// If no address in URL, return empty state
	if (!address) {
		return {
			scoreData: null,
			shareMode: false
		};
	}

	try {
		// Use SvelteKit's special fetch that works in SSR
		// This allows us to call our API route directly without HTTP overhead
		const response = await fetch(`/api/score?address=${encodeURIComponent(address)}`);

		if (!response.ok) {
			let errorMessage = 'Failed to load score data';
			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorData.error || errorMessage;
			} catch {
				// If response is not JSON, try to get text
				try {
					errorMessage = await response.text() || errorMessage;
				} catch {
					// Use default message
				}
			}
			// Return error state instead of throwing to allow client-side error handling
			return {
				scoreData: null,
				error: errorMessage,
				address,
				shareMode
			};
		}

		const scoreData = await response.json();

		// Set meta tags headers for SSR (if supported by adapter)
		if (shareMode && scoreData) {
			const score = Math.round(scoreData.scores.overall);
			const description = `${scoreData.address} - Livability Score: ${score}/100`;

			setHeaders({
				// These headers can be used by adapters to set meta tags
				'x-og-title': `${scoreData.address} - Livability Score: ${score}/100`,
				'x-og-description': description,
				'x-og-url': url.toString(),
				'x-og-image': `${url.origin}/og-image.png`,
				'x-twitter-card': 'summary_large_image',
				'x-twitter-title': `${scoreData.address} - Livability Score`,
				'x-twitter-description': description,
				'x-twitter-image': `${url.origin}/og-image.png`
			});
		}

		return {
			scoreData,
			address,
			shareMode
		};
	} catch (err) {
		console.error('Error in page load:', err);
		return {
			scoreData: null,
			error: err instanceof Error ? err.message : 'An error occurred',
			address,
			shareMode
		};
	}
};

