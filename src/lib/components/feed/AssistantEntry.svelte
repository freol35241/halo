<script lang="ts">
	import type { FeedEntry } from '$lib/types/feed';
	import ThinkingBlock from './ThinkingBlock.svelte';

	export let entry: FeedEntry;

	function formatTs(ts: string): string {
		try {
			return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return ts;
		}
	}
</script>

<div class="assistant-entry" data-role="assistant">
	<div class="header">
		<span class="ts">{formatTs(entry.ts)}</span>
		<span class="label">claude</span>
	</div>
	{#if entry.metadata?.thinking}
		<ThinkingBlock text={entry.metadata.thinking} />
	{/if}
	<div class="content">{entry.content}</div>
</div>

<style>
	.assistant-entry {
		margin-bottom: var(--space-3);
		padding: var(--space-1) 0;
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-bottom: var(--space-2);
	}

	.ts {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-dim);
	}

	.label {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent);
	}

	.content {
		font-family: var(--font-sans);
		font-size: 14px;
		color: var(--color-text);
		line-height: 1.6;
	}
</style>
