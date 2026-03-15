import { writable } from 'svelte/store';

export const sidebarOpen = writable(false);

export function openSidebar(): void {
	sidebarOpen.set(true);
}

export function closeSidebar(): void {
	sidebarOpen.set(false);
}

export function toggleSidebar(): void {
	sidebarOpen.update((v) => !v);
}
