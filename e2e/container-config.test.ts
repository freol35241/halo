import { test, expect } from '@playwright/test';

test.describe('Container Config View', () => {
	test('shows error when container not found', async ({ page }) => {
		await page.goto('/containers/nonexistent-id-xyz');

		await expect(page.getByText(/not found/i)).toBeVisible();
	});

	test('shows back button on container config page', async ({ page }) => {
		await page.goto('/containers/nonexistent-id-xyz');

		await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
	});

	test('shows four tabs when container exists', async ({ page, request }) => {
		// Create a container via API
		const res = await request.post('/api/containers', {
			data: { name: 'e2e-cfg-test', templateId: 'blank', config: { image: 'alpine:latest' } }
		});
		// If creation fails (e.g., Docker unavailable), skip the test
		if (!res.ok()) {
			test.skip();
			return;
		}
		const container = await res.json();

		await page.goto(`/containers/${container.id}`);

		await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
		await expect(page.getByRole('tab', { name: /devcontainer/i })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Env' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Ports' })).toBeVisible();
	});

	test('tab switching works when container exists', async ({ page, request }) => {
		const res = await request.post('/api/containers', {
			data: { name: 'e2e-tab-test', templateId: 'blank', config: { image: 'alpine:latest' } }
		});
		if (!res.ok()) {
			test.skip();
			return;
		}
		const container = await res.json();

		await page.goto(`/containers/${container.id}`);

		// Overview tab is active by default
		await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		// Click Env tab
		await page.getByRole('tab', { name: 'Env' }).click();
		await expect(page.getByRole('tab', { name: 'Env' })).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('tabpanel')).toBeVisible();
	});

	test('shows container name in header when container exists', async ({ page, request }) => {
		const res = await request.post('/api/containers', {
			data: {
				name: 'e2e-name-test',
				templateId: 'blank',
				config: { image: 'alpine:latest' }
			}
		});
		if (!res.ok()) {
			test.skip();
			return;
		}
		const container = await res.json();

		await page.goto(`/containers/${container.id}`);

		await expect(page.getByText('e2e-name-test')).toBeVisible();
	});
});
