<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let commands: string[];

	const dispatch = createEventDispatcher<{ select: string }>();

	function select(cmd: string): void {
		dispatch('select', cmd);
	}
</script>

{#if commands.length > 0}
	<div class="quick-commands">
		{#each commands as cmd}
			<button class="pill" on:click={() => select(cmd)}>
				{cmd}
			</button>
		{/each}
	</div>
{/if}

<style>
	.quick-commands {
		padding: var(--space-1) var(--space-4);
		display: flex;
		gap: var(--space-1);
		overflow-x: auto;
		flex-shrink: 0;
		scrollbar-width: none;
	}

	.quick-commands::-webkit-scrollbar {
		display: none;
	}

	.pill {
		padding: 5px 10px;
		border-radius: var(--radius-md);
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		transition: border-color 0.15s;
	}

	.pill:hover {
		border-color: var(--color-accent-dim);
		color: var(--color-text);
	}
</style>
