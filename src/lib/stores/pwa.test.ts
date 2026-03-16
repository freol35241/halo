import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import type { BeforeInstallPromptEvent } from './pwa.js';
import {
	installPromptEvent,
	setInstallPrompt,
	dismissInstallPrompt,
	triggerInstallPrompt,
	canInstall
} from './pwa.js';

describe('PWA install prompt store', () => {
	beforeEach(() => {
		// Reset store state before each test
		dismissInstallPrompt();
	});

	it('initializes with no install prompt', () => {
		expect(get(installPromptEvent)).toBeNull();
	});

	it('canInstall is false when no prompt event', () => {
		expect(get(canInstall)).toBe(false);
	});

	it('setInstallPrompt stores the event', () => {
		const fakeEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
		setInstallPrompt(fakeEvent as unknown as BeforeInstallPromptEvent);
		expect(get(installPromptEvent)).toBe(fakeEvent);
	});

	it('canInstall is true after setting prompt event', () => {
		const fakeEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
		setInstallPrompt(fakeEvent as unknown as BeforeInstallPromptEvent);
		expect(get(canInstall)).toBe(true);
	});

	it('dismissInstallPrompt clears the event', () => {
		const fakeEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) };
		setInstallPrompt(fakeEvent as unknown as BeforeInstallPromptEvent);
		dismissInstallPrompt();
		expect(get(installPromptEvent)).toBeNull();
		expect(get(canInstall)).toBe(false);
	});

	it('triggerInstallPrompt calls prompt() and clears after accepted', async () => {
		const fakeEvent = {
			prompt: vi.fn().mockResolvedValue(undefined),
			userChoice: Promise.resolve({ outcome: 'accepted' as const })
		};
		setInstallPrompt(fakeEvent as unknown as BeforeInstallPromptEvent);

		await triggerInstallPrompt();

		expect(fakeEvent.prompt).toHaveBeenCalledOnce();
		expect(get(installPromptEvent)).toBeNull();
	});

	it('triggerInstallPrompt does nothing when no prompt event', async () => {
		// Should not throw
		await expect(triggerInstallPrompt()).resolves.toBeUndefined();
	});

	it('triggerInstallPrompt clears event after dismissed', async () => {
		const fakeEvent = {
			prompt: vi.fn().mockResolvedValue(undefined),
			userChoice: Promise.resolve({ outcome: 'dismissed' as const })
		};
		setInstallPrompt(fakeEvent as unknown as BeforeInstallPromptEvent);

		await triggerInstallPrompt();

		expect(get(installPromptEvent)).toBeNull();
	});
});
