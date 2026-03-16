import { test, expect } from '@playwright/test';

test.describe('VS Code Overlay', () => {
	test('VS Code button appears in container config when container exists', async ({
		page,
		request
	}) => {
		const res = await request.post('/api/containers', {
			data: { name: 'e2e-vscode-test', templateId: 'blank', config: { image: 'alpine:latest' } }
		});
		if (!res.ok()) {
			test.skip();
			return;
		}
		const container = await res.json();

		await page.goto(`/containers/${container.id}`);

		await expect(page.getByRole('button', { name: /vs code/i })).toBeVisible();
	});

	test('clicking VS Code button opens overlay with iframe', async ({ page, request }) => {
		const res = await request.post('/api/containers', {
			data: { name: 'e2e-vscode-overlay', templateId: 'blank', config: { image: 'alpine:latest' } }
		});
		if (!res.ok()) {
			test.skip();
			return;
		}
		const container = await res.json();

		await page.goto(`/containers/${container.id}`);

		await page.getByRole('button', { name: /vs code/i }).click();

		// Overlay is visible
		await expect(page.getByRole('dialog', { name: /vs code/i })).toBeVisible();

		// Contains an iframe
		const iframe = page.locator('iframe[title*="VS Code"]');
		await expect(iframe).toBeVisible();

		// Back button is present
		await expect(page.getByRole('button', { name: /close vs code overlay/i })).toBeVisible();

		// "New tab" link is present
		await expect(page.getByRole('link', { name: /new tab/i })).toBeVisible();
	});

	test('overlay back button closes the overlay', async ({ page, request }) => {
		const res = await request.post('/api/containers', {
			data: { name: 'e2e-vscode-close', templateId: 'blank', config: { image: 'alpine:latest' } }
		});
		if (!res.ok()) {
			test.skip();
			return;
		}
		const container = await res.json();

		await page.goto(`/containers/${container.id}`);

		await page.getByRole('button', { name: /vs code/i }).click();
		await expect(page.getByRole('dialog', { name: /vs code/i })).toBeVisible();

		await page.getByRole('button', { name: /close vs code overlay/i }).click();
		await expect(page.getByRole('dialog', { name: /vs code/i })).not.toBeVisible();
	});
});
