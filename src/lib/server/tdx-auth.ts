import { env } from '$env/dynamic/private';

// Simple in-memory cache for TDX access token
let cachedToken: string | null = null;
let tokenExpiration = 0;

interface TDXTokenResponse {
	access_token: string;
	expires_in: number;
	token_type: string;
}

export async function getTDXAccessToken(): Promise<string> {
	const now = Date.now();

	// If we have a valid cached token (with 5 minutes safety margin), reuse it
	if (cachedToken && now < tokenExpiration - 300_000) {
		return cachedToken;
	}

	console.log('🔄 Fetching new TDX Access Token...');

	const params = new URLSearchParams();
	params.append('grant_type', 'client_credentials');
	params.append('client_id', env.TDX_CLIENT_ID);
	params.append('client_secret', env.TDX_CLIENT_SECRET);

	try {
		const response = await fetch(
			'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: params
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`TDX Auth Failed (${response.status}): ${errorText}`);
		}

		const data: TDXTokenResponse = await response.json();

		cachedToken = data.access_token;
		tokenExpiration = now + data.expires_in * 1000;

		return cachedToken;
	} catch (error) {
		console.error('❌ Error getting TDX token:', error);
		throw error;
	}
}


