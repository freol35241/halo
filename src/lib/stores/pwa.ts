import { writable, derived } from 'svelte/store';

// The BeforeInstallPromptEvent is not in standard TypeScript lib yet
export interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const installPromptEvent = writable<BeforeInstallPromptEvent | null>(null);

export const canInstall = derived(installPromptEvent, ($event) => $event !== null);

export function setInstallPrompt(event: BeforeInstallPromptEvent): void {
	installPromptEvent.set(event);
}

export function dismissInstallPrompt(): void {
	installPromptEvent.set(null);
}

export async function triggerInstallPrompt(): Promise<void> {
	let event: BeforeInstallPromptEvent | null = null;
	installPromptEvent.subscribe((e) => {
		event = e;
	})();

	if (!event) return;

	await (event as BeforeInstallPromptEvent).prompt();
	await (event as BeforeInstallPromptEvent).userChoice;
	installPromptEvent.set(null);
}
