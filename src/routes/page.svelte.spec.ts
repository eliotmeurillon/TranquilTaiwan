import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render h1', async () => {
		// Mock the page data props
		const mockData = {
			scoreData: null,
			error: null,
			address: null,
			shareMode: false
		};

		render(Page, {
			props: {
				data: mockData
			}
		});

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
	});
});
