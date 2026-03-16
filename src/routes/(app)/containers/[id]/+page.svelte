<script lang="ts">
	import type { PageData } from './$types';
	import ContainerConfigView from '$lib/components/ContainerConfigView.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.container ? `${data.container.name} — HALO` : 'Container — HALO'}</title>
</svelte:head>

{#if data.error}
	<div class="error-state">
		<button class="back-btn" on:click={() => history.back()} aria-label="Back">
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
		<p class="error-message">{data.error}</p>
	</div>
{:else if data.container}
	<ContainerConfigView container={data.container} />
{/if}

<style>
	.error-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-6);
		font-family: var(--font-sans);
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
		align-self: flex-start;
	}

	.back-btn:hover {
		color: var(--color-text);
		background-color: var(--color-sidebar-hover);
	}

	.error-message {
		color: var(--color-text-muted);
		margin: 0;
	}
</style>
