import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/HALO/);
});

test('home page displays app name', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toHaveText('HALO');
});

test.describe('New Container modal', () => {
	test('opens when New Container button is clicked on desktop', async ({ page }) => {
		await page.goto('/');
		// Click the "New Container" button in the sidebar (visible on desktop)
		await page.getByRole('button', { name: 'New Container' }).click();
		await expect(page.getByRole('dialog', { name: 'New Container' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'New Container' })).toBeVisible();
	});

	test('shows template cards in step 1', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Container' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Container' });
		await expect(dialog).toBeVisible();
		// Template list should appear after loading
		const templateList = dialog.getByRole('listbox', { name: 'Container templates' });
		await expect(templateList).toBeVisible();
	});

	test('closes when backdrop is clicked', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Container' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Container' });
		await expect(dialog).toBeVisible();
		// Click the backdrop (the dialog element itself, outside the sheet)
		await dialog.click({ position: { x: 10, y: 10 } });
		await expect(dialog).not.toBeVisible();
	});

	test('navigates to step 2 when Continue is clicked', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Container' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Container' });
		await expect(dialog).toBeVisible();
		// Wait for templates to load
		await expect(dialog.getByRole('listbox')).toBeVisible();
		// Click Continue
		await dialog.getByRole('button', { name: 'Continue' }).click();
		// Step 2 heading changes to Configure
		await expect(dialog.getByRole('heading', { name: 'Configure' })).toBeVisible();
		await expect(dialog.getByPlaceholder('my-project')).toBeVisible();
	});

	test('shows validation error when name is empty on submit', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Container' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Container' });
		await expect(dialog.getByRole('listbox')).toBeVisible();
		await dialog.getByRole('button', { name: 'Continue' }).click();
		// Try to submit without a name
		await dialog.getByRole('button', { name: 'Create & Launch' }).click();
		await expect(dialog.getByRole('alert')).toBeVisible();
	});

	test('can navigate back from step 2 to step 1', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Container' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Container' });
		await expect(dialog.getByRole('listbox')).toBeVisible();
		await dialog.getByRole('button', { name: 'Continue' }).click();
		await expect(dialog.getByRole('heading', { name: 'Configure' })).toBeVisible();
		// Go back
		await dialog.getByRole('button', { name: 'Back to template selection' }).click();
		await expect(dialog.getByRole('heading', { name: 'New Container' })).toBeVisible();
	});
});
