<script lang="ts">
	import type { Container } from '$lib/types';
	import StatusDot from './StatusDot.svelte';

	export let container: Container;
	export let active = false;
</script>

<a class="container-item" class:active href="/containers/{container.id}">
	<StatusDot status={container.status} />
	<span class="container-name">{container.name}</span>
</a>

<style>
	.container-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		text-align: left;
		border-radius: var(--radius-md);
		font-family: var(--font-sans);
		font-size: 13px;
		text-decoration: none;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.container-item:hover {
		background-color: var(--color-sidebar-hover);
		color: var(--color-text);
	}

	.container-item.active {
		background-color: var(--color-sidebar-active);
		color: var(--color-text);
	}

	.container-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}
</style>
