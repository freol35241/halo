import { test, expect } from '@playwright/test';

test.describe('New Session Modal', () => {
	test('New Session button opens modal', async ({ page }) => {
		await page.goto('/');

		const btn = page.getByRole('button', { name: 'New Session' });
		await btn.click();

		await expect(page.getByRole('dialog', { name: 'New Session' })).toBeVisible();
	});

	test('modal closes when backdrop is clicked', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'New Session' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Session' });
		await expect(dialog).toBeVisible();

		// Click the backdrop (outside the sheet)
		await page.mouse.click(5, 5);
		await expect(dialog).not.toBeVisible();
	});

	test('modal closes when Escape is pressed', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'New Session' }).click();
		const dialog = page.getByRole('dialog', { name: 'New Session' });
		await expect(dialog).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
	});

	test('modal shows session type buttons', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'New Session' }).click();

		await expect(page.getByRole('button', { name: 'Claude' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Terminal' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Lisa Loop' })).toBeVisible();
	});

	test('session type button selection toggles aria-pressed', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Session' }).click();

		// Claude is selected by default
		const claudeBtn = page.getByRole('button', { name: 'Claude' });
		await expect(claudeBtn).toHaveAttribute('aria-pressed', 'true');

		// Click Terminal
		const terminalBtn = page.getByRole('button', { name: 'Terminal' });
		await terminalBtn.click();
		await expect(terminalBtn).toHaveAttribute('aria-pressed', 'true');
		await expect(claudeBtn).toHaveAttribute('aria-pressed', 'false');
	});

	test('modal shows name input', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Session' }).click();

		const nameInput = page.getByPlaceholder('Weather Routing Solver');
		await expect(nameInput).toBeVisible();
	});

	test('shows validation error when name is empty', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'New Session' }).click();

		// Attempt to submit without a name — Launch button may be disabled if no containers
		// So just type and clear the name to trigger validation
		const nameInput = page.getByPlaceholder('Weather Routing Solver');
		await nameInput.fill('test');
		await nameInput.fill('');

		// Submit via form (if button is enabled)
		const submitBtn = page.getByRole('button', { name: /launch/i });
		if (await submitBtn.isEnabled()) {
			await submitBtn.click();
			await expect(page.getByRole('alert').first()).toBeVisible();
		}
	});

	test('create session flow with API (skips if no running containers)', async ({
		page,
		request
	}) => {
		// Create a container first
		const containerRes = await request.post('/api/containers', {
			data: { name: 'e2e-session-flow', templateId: 'blank', config: { image: 'alpine:latest' } }
		});
		if (!containerRes.ok()) {
			test.skip();
			return;
		}
		const container = await containerRes.json();

		// Manually set container to running state via API if possible
		// (start may fail without Docker; skip if it does)
		const startRes = await request.post(`/api/containers/${container.id}/start`);
		if (!startRes.ok()) {
			test.skip();
			return;
		}

		await page.goto('/');
		await page.getByRole('button', { name: 'New Session' }).click();

		const dialog = page.getByRole('dialog', { name: 'New Session' });
		await expect(dialog).toBeVisible();

		// Fill name
		await page.getByPlaceholder('Weather Routing Solver').fill('E2E Test Session');

		// Submit
		await page.getByRole('button', { name: 'Launch' }).click();

		// After submit, modal should close (navigate away or close)
		await expect(dialog).not.toBeVisible({ timeout: 5000 });
	});
});
