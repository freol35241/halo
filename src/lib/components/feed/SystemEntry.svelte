<script lang="ts">
	import type { FeedEntry } from '$lib/types/feed';

	export let entry: FeedEntry;

	$: statusClass = entry.metadata?.status ?? '';
</script>

<div
	class="system-entry"
	data-role="system"
	class:success={statusClass === 'success'}
	class:error={statusClass === 'error'}
	class:pending={statusClass === 'pending'}
>
	<span class="marker">◈</span>
	<span class="content">{entry.content}</span>
	{#if entry.metadata?.phase}
		<span class="phase">{entry.metadata.phase}</span>
	{/if}
</div>

<style>
	.system-entry {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		margin-bottom: var(--space-2);
		border-radius: var(--radius-md);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
	}

	.system-entry.success {
		border-color: var(--color-green-dim);
		background-color: var(--color-green-bg);
	}

	.system-entry.error {
		border-color: var(--color-red-dim);
		background-color: var(--color-red-bg);
	}

	.system-entry.pending {
		border-color: var(--color-orange-dim);
		background-color: var(--color-orange-bg);
	}

	.marker {
		font-size: 12px;
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.content {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-muted);
		flex: 1;
	}

	.phase {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-dim);
		background-color: var(--color-surface-raised);
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
	}
</style>
