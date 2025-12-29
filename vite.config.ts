import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load environment variables from .env files
	// This makes them available in process.env for tests
	const env = loadEnv(mode, process.cwd(), '');
	
	// Explicitly set env vars on process.env for Node.js tests
	// This ensures they're available when the mock accesses process.env
	Object.assign(process.env, env);

	return {
		plugins: [
			tailwindcss(),
			sveltekit(),
			paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
		],
		optimizeDeps: {
			include: ['leaflet', 'leaflet.heat']
		},

		test: {
			expect: { requireAssertions: true },
			// Load all environment variables (not just VITE_ prefixed ones)
			env,
			// Global test timeout for integration tests hitting external APIs
			testTimeout: 120000, // 2 minutes for slow API calls with retries

			projects: [
				{
					extends: './vite.config.ts',

					test: {
						name: 'client',

						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium', headless: true }]
						},

						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**']
					}
				},

				{
					extends: './vite.config.ts',

					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
