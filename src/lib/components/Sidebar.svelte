<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Container } from '$lib/types';
	import type { Session } from '$lib/types';
	import { sidebarOpen, closeSidebar } from '$lib/stores/sidebar';
	import ContainerItem from './ContainerItem.svelte';
	import SessionItem from './SessionItem.svelte';
	import NewContainerModal from './NewContainerModal.svelte';
	import NewSessionModal from './NewSessionModal.svelte';

	let showNewContainerModal = false;
	let showNewSessionModal = false;

	let containers: Container[] = [];
	let sessions: Session[] = [];

	async function loadData(): Promise<void> {
		try {
			const [cRes, sRes] = await Promise.all([fetch('/api/containers'), fetch('/api/sessions')]);
			if (cRes.ok) containers = (await cRes.json()) as Container[];
			if (sRes.ok) sessions = (await sRes.json()) as Session[];
		} catch {
			// silently fail — sidebar still renders empty lists
		}
	}

	onMount(loadData);
	afterNavigate(loadData);

	$: currentPath = $page.url.pathname;
	$: activeContainerId = currentPath.startsWith('/containers/') ? currentPath.split('/')[2] : null;
	$: activeSessionId = currentPath.startsWith('/sessions/') ? currentPath.split('/')[2] : null;

	function handleNewSession(): void {
		showNewSessionModal = true;
	}

	function handleNewContainer(): void {
		showNewContainerModal = true;
	}
</script>

<!-- Backdrop (mobile only, shown when sidebar open) -->
{#if $sidebarOpen}
	<div
		class="sidebar-backdrop"
		role="presentation"
		aria-hidden="true"
		on:click={closeSidebar}
	></div>
{/if}

<nav class="sidebar" class:sidebar--open={$sidebarOpen} aria-label="Sidebar">
	<!-- Logo -->
	<div class="sidebar-logo">
		<span class="logo-text">HALO</span>
		<span class="logo-version">v0.1</span>
		<button class="close-btn" aria-label="Close menu" on:click={closeSidebar}>
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<line x1="2" y1="2" x2="14" y2="14" />
				<line x1="14" y1="2" x2="2" y2="14" />
			</svg>
		</button>
	</div>

	<!-- Containers -->
	<section class="sidebar-section">
		<div class="section-header">
			<span class="section-label">Containers</span>
		</div>
		<ul class="item-list" role="list">
			{#each containers as container (container.id)}
				<li>
					<ContainerItem {container} active={activeContainerId === container.id} />
				</li>
			{/each}
			{#if containers.length === 0}
				<li class="empty-item">No containers</li>
			{/if}
		</ul>
	</section>

	<!-- Sessions -->
	<section class="sidebar-section">
		<div class="section-header">
			<span class="section-label">Sessions</span>
		</div>
		<ul class="item-list" role="list">
			{#each sessions as session (session.id)}
				<li>
					<SessionItem {session} active={activeSessionId === session.id} />
				</li>
			{/each}
			{#if sessions.length === 0}
				<li class="empty-item">No sessions</li>
			{/if}
		</ul>
	</section>

	<!-- Action buttons -->
	<div class="sidebar-actions">
		<button class="action-btn action-btn--primary" on:click={handleNewSession}>
			<svg
				width="14"
				height="14"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<line x1="7" y1="1" x2="7" y2="13" />
				<line x1="1" y1="7" x2="13" y2="7" />
			</svg>
			New Session
		</button>
		<button class="action-btn" on:click={handleNewContainer}>
			<svg
				width="14"
				height="14"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<line x1="7" y1="1" x2="7" y2="13" />
				<line x1="1" y1="7" x2="13" y2="7" />
			</svg>
			New Container
		</button>
	</div>
</nav>

<NewContainerModal open={showNewContainerModal} on:close={() => (showNewContainerModal = false)} />
<NewSessionModal open={showNewSessionModal} on:close={() => (showNewSessionModal = false)} />

<style>
	/* Backdrop — mobile only, rendered via {#if} */
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 10;
	}

	/* Sidebar */
	.sidebar {
		display: flex;
		flex-direction: column;
		width: 260px;
		height: 100%;
		background-color: var(--color-sidebar);
		border-right: 1px solid var(--color-border);
		overflow-y: auto;
		flex-shrink: 0;
	}

	/* Logo */
	.sidebar-logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.logo-text {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-accent);
		letter-spacing: 0.1em;
	}

	.logo-version {
		font-size: 10px;
		color: var(--color-text-dim);
		font-family: var(--font-mono);
	}

	.close-btn {
		display: none;
		margin-left: auto;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		line-height: 0;
	}

	.close-btn:hover {
		color: var(--color-text);
		background-color: var(--color-sidebar-hover);
	}

	/* Sections */
	.sidebar-section {
		padding: var(--space-3) var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}

	.section-header {
		display: flex;
		align-items: center;
		padding: 0 var(--space-2) var(--space-1);
	}

	.section-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--color-text-dim);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.empty-item {
		font-size: 12px;
		color: var(--color-text-dim);
		padding: var(--space-2) var(--space-3);
		font-style: italic;
		font-family: var(--font-sans);
	}

	/* Actions */
	.sidebar-actions {
		margin-top: auto;
		padding: var(--space-3) var(--space-2);
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 13px;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.action-btn:hover {
		background-color: var(--color-sidebar-hover);
		color: var(--color-text);
	}

	.action-btn--primary {
		border-color: var(--color-accent-dim);
		color: var(--color-accent);
	}

	.action-btn--primary:hover {
		background-color: var(--color-accent-bg);
		color: var(--color-accent);
	}

	/* Mobile: sidebar hidden off-screen, shown as overlay when open */
	@media (max-width: 639px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			height: 100%;
			z-index: 20;
			transform: translateX(-100%);
			transition: transform 0.25s ease;
			visibility: hidden;
		}

		.sidebar.sidebar--open {
			transform: translateX(0);
			visibility: visible;
		}

		.close-btn {
			display: flex;
		}
	}
</style>
