import { test, expect } from '@playwright/test';

test.describe('App Shell — Sidebar', () => {
	test('sidebar is hidden by default on mobile', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 375, height: 812 }
		});
		const page = await context.newPage();
		await page.goto('/');

		const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
		await expect(sidebar).not.toBeVisible();

		await context.close();
	});

	test('sidebar opens when hamburger button is clicked on mobile', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 375, height: 812 }
		});
		const page = await context.newPage();
		await page.goto('/');

		const hamburger = page.getByRole('button', { name: 'Open menu' });
		await hamburger.click();

		const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
		await expect(sidebar).toBeVisible();

		await context.close();
	});

	test('sidebar closes when close button is clicked on mobile', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 375, height: 812 }
		});
		const page = await context.newPage();
		await page.goto('/');

		// Open
		await page.getByRole('button', { name: 'Open menu' }).click();
		const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
		await expect(sidebar).toBeVisible();

		// Close via the button inside the sidebar
		await sidebar.getByRole('button', { name: 'Close menu' }).click();
		await expect(sidebar).not.toBeVisible();

		await context.close();
	});

	test('sidebar closes when backdrop is clicked on mobile', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 375, height: 812 }
		});
		const page = await context.newPage();
		await page.goto('/');

		await page.getByRole('button', { name: 'Open menu' }).click();
		const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
		await expect(sidebar).toBeVisible();

		const backdrop = page.locator('.sidebar-backdrop');
		await backdrop.click();
		await expect(sidebar).not.toBeVisible();

		await context.close();
	});

	test('sidebar is always visible on desktop', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 800 }
		});
		const page = await context.newPage();
		await page.goto('/');

		const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
		await expect(sidebar).toBeVisible();

		await context.close();
	});

	test('hamburger button is not visible on desktop', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 800 }
		});
		const page = await context.newPage();
		await page.goto('/');

		const hamburger = page.getByRole('button', { name: 'Open menu' });
		await expect(hamburger).not.toBeVisible();

		await context.close();
	});

	test('sidebar contains HALO logo', async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 800 }
		});
		const page = await context.newPage();
		await page.goto('/');

		const sidebar = page.getByRole('navigation', { name: 'Sidebar' });
		await expect(sidebar.getByText('HALO')).toBeVisible();

		await context.close();
	});
});
