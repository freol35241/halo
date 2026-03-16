<script lang="ts">
	import { onMount } from 'svelte';

	export let containerName: string;
	export let onClose: () => void;

	const iframeSrc = `/ide/${containerName}/`;

	type ConnectionStatus = 'loading' | 'connected' | 'error';
	let status: ConnectionStatus = 'loading';

	function handleIframeLoad(): void {
		status = 'connected';
	}

	function handleIframeError(): void {
		status = 'error';
	}

	// Check reachability via fetch as a belt-and-suspenders approach
	onMount(() => {
		const controller = new AbortController();
		fetch(iframeSrc, { signal: controller.signal, method: 'HEAD' })
			.then((res) => {
				if (!res.ok) status = 'error';
			})
			.catch(() => {
				// Ignore abort errors on cleanup; iframe load/error handles it
			});
		return () => controller.abort();
	});
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label="VS Code — {containerName}">
	<!-- Header -->
	<header class="overlay-header">
		<button class="back-btn" on:click={onClose} aria-label="Close VS Code overlay">
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<polyline points="10,2 4,8 10,14" />
			</svg>
			Back
		</button>

		<div class="header-info">
			<span class="container-name">{containerName}</span>
			<span
				class="status-pill"
				class:status-pill--loading={status === 'loading'}
				class:status-pill--connected={status === 'connected'}
				class:status-pill--error={status === 'error'}
			>
				{#if status === 'loading'}
					Connecting…
				{:else if status === 'connected'}
					Connected
				{:else}
					Unreachable
				{/if}
			</span>
		</div>

		<a
			href={iframeSrc}
			target="_blank"
			rel="noopener"
			class="new-tab-btn"
			aria-label="Open VS Code in new tab"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<path d="M6 2H2v10h10V8" />
				<path d="M8 2h4v4" />
				<line x1="7" y1="7" x2="12" y2="2" />
			</svg>
			New tab
		</a>
	</header>

	<!-- Content -->
	<div class="overlay-body">
		{#if status === 'error'}
			<div class="error-state" role="alert">
				<p class="error-title">VS Code Unreachable</p>
				<p class="error-detail">
					Could not connect to code-server for <strong>{containerName}</strong>. Make sure the
					container is running.
				</p>
				<a href={iframeSrc} target="_blank" rel="noopener" class="retry-link"
					>Try opening directly</a
				>
			</div>
		{:else}
			{#if status === 'loading'}
				<div class="loading-overlay" aria-hidden="true">
					<span class="loading-label">Loading VS Code…</span>
				</div>
			{/if}
			<iframe
				src={iframeSrc}
				title="VS Code — {containerName}"
				class="vscode-iframe"
				on:load={handleIframeLoad}
				on:error={handleIframeError}
				allow="clipboard-read; clipboard-write"
			></iframe>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		background-color: var(--color-bg);
	}

	/* Header */
	.overlay-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 13px;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.back-btn:hover {
		color: var(--color-text);
		background-color: var(--color-sidebar-hover);
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
		min-width: 0;
	}

	.container-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		font-family: var(--font-sans);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-pill {
		font-size: 11px;
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.status-pill--loading {
		background-color: var(--color-orange-bg);
		color: var(--color-orange);
	}

	.status-pill--connected {
		background-color: var(--color-green-bg);
		color: var(--color-green);
	}

	.status-pill--error {
		background-color: var(--color-red-bg);
		color: var(--color-red);
	}

	.new-tab-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-muted);
		font-size: 12px;
		font-family: var(--font-sans);
		text-decoration: none;
		flex-shrink: 0;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.new-tab-btn:hover {
		background-color: var(--color-sidebar-hover);
		color: var(--color-text);
	}

	/* Body */
	.overlay-body {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-bg);
		z-index: 1;
	}

	.loading-label {
		font-size: 13px;
		color: var(--color-text-muted);
		font-family: var(--font-sans);
	}

	.vscode-iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
	}

	/* Error state */
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		height: 100%;
		padding: var(--space-8);
		text-align: center;
		font-family: var(--font-sans);
	}

	.error-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.error-detail {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
		max-width: 360px;
	}

	.retry-link {
		font-size: 13px;
		color: var(--color-accent);
		text-decoration: none;
	}

	.retry-link:hover {
		text-decoration: underline;
	}
</style>
