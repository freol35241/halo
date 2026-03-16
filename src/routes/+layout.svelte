<script lang="ts">
	import '../lib/styles/tokens.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { sidebarOpen, openSidebar } from '$lib/stores/sidebar';
</script>

<div class="app-shell">
	<!-- Sidebar (overlay on mobile, persistent on desktop) -->
	<Sidebar />

	<!-- Main area -->
	<div class="main-wrapper">
		<!-- Header (mobile only) -->
		<header class="app-header">
			<button
				class="hamburger"
				aria-label="Open menu"
				aria-expanded={$sidebarOpen}
				on:click={openSidebar}
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<line x1="2" y1="5" x2="18" y2="5" />
					<line x1="2" y1="10" x2="18" y2="10" />
					<line x1="2" y1="15" x2="18" y2="15" />
				</svg>
			</button>
			<span class="header-title">HALO</span>
		</header>

		<!-- Page content -->
		<main class="main-content">
			<slot />
		</main>
	</div>
</div>

<InstallPrompt />

<style>
	.app-shell {
		display: flex;
		height: 100vh;
		overflow: hidden;
		background-color: var(--color-bg);
	}

	/* Main wrapper occupies remaining space */
	.main-wrapper {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	/* Mobile header */
	.app-header {
		display: none;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	@media (max-width: 639px) {
		.app-header {
			display: flex;
		}
	}

	.hamburger {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		line-height: 0;
		display: flex;
		align-items: center;
	}

	.hamburger:hover {
		color: var(--color-text);
		background-color: var(--color-sidebar-hover);
	}

	.header-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-accent);
		letter-spacing: 0.1em;
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
	}
</style>
