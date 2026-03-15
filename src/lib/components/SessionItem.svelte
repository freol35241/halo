<script lang="ts">
	import type { Session } from '$lib/types';
	import StatusDot from './StatusDot.svelte';
	import TypeBadge from './TypeBadge.svelte';

	export let session: Session;
	export let active = false;
</script>

<button class="session-item" class:active on:click>
	<StatusDot status={session.status} />
	<span class="session-name">{session.name}</span>
	<TypeBadge type={session.type} />
</button>

<style>
	.session-item {
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
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.session-item:hover {
		background-color: var(--color-sidebar-hover);
		color: var(--color-text);
	}

	.session-item.active {
		background-color: var(--color-sidebar-active);
		color: var(--color-text);
	}

	.session-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}
</style>
