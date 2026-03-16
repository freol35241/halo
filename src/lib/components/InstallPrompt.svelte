<script lang="ts">
	import { onMount } from 'svelte';
	import {
		canInstall,
		setInstallPrompt,
		dismissInstallPrompt,
		triggerInstallPrompt
	} from '$lib/stores/pwa.js';
	import type { BeforeInstallPromptEvent } from '$lib/stores/pwa.js';

	let visible = false;

	onMount(() => {
		const handler = (e: Event) => {
			e.preventDefault();
			setInstallPrompt(e as BeforeInstallPromptEvent);
			visible = true;
		};
		window.addEventListener('beforeinstallprompt', handler);
		return () => window.removeEventListener('beforeinstallprompt', handler);
	});

	function handleInstall(): void {
		triggerInstallPrompt().then(() => {
			visible = false;
		});
	}

	function handleDismiss(): void {
		dismissInstallPrompt();
		visible = false;
	}
</script>

{#if visible && $canInstall}
	<div class="install-prompt" role="dialog" aria-label="Install HALO app">
		<div class="install-prompt__content">
			<div class="install-prompt__icon">
				<img src="/icons/icon-192.svg" alt="HALO" width="40" height="40" />
			</div>
			<div class="install-prompt__text">
				<span class="install-prompt__title">Install HALO</span>
				<span class="install-prompt__desc">Add to home screen for the best experience</span>
			</div>
			<div class="install-prompt__actions">
				<button class="install-prompt__btn install-prompt__btn--dismiss" on:click={handleDismiss}>
					Later
				</button>
				<button class="install-prompt__btn install-prompt__btn--install" on:click={handleInstall}>
					Install
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.install-prompt {
		position: fixed;
		bottom: env(safe-area-inset-bottom, 0);
		left: 0;
		right: 0;
		z-index: 1000;
		padding: var(--space-4);
		padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
		background: var(--color-surface-raised);
		border-top: 1px solid var(--color-border);
	}

	.install-prompt__content {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		max-width: 480px;
		margin: 0 auto;
	}

	.install-prompt__icon {
		flex-shrink: 0;
	}

	.install-prompt__icon img {
		border-radius: var(--radius-md);
	}

	.install-prompt__text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.install-prompt__title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
	}

	.install-prompt__desc {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.install-prompt__actions {
		display: flex;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.install-prompt__btn {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		border: none;
	}

	.install-prompt__btn--dismiss {
		background: transparent;
		color: var(--color-text-muted);
	}

	.install-prompt__btn--dismiss:hover {
		color: var(--color-text);
	}

	.install-prompt__btn--install {
		background: var(--color-accent);
		color: var(--color-bg);
	}

	.install-prompt__btn--install:hover {
		opacity: 0.9;
	}
</style>
