<script lang="ts">
	import type { FeedEntry } from '$lib/types/feed';

	export let entry: FeedEntry;

	function formatTs(ts: string): string {
		try {
			return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return ts;
		}
	}
</script>

<div class="command-entry" data-role="command">
	<span class="prompt">$</span>
	<span class="command">{entry.content}</span>
	<span class="ts" data-testid="command-ts">{formatTs(entry.ts)}</span>
</div>

<style>
	.command-entry {
		background-color: var(--color-surface-raised);
		border-radius: var(--radius-lg);
		padding: var(--space-2) var(--space-3);
		margin-bottom: var(--space-1);
		margin-top: var(--space-2);
		border-left: 2px solid var(--color-text-dim);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.prompt {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-green);
		flex-shrink: 0;
	}

	.command {
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--color-text);
		flex: 1;
	}

	.ts {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-dim);
		margin-left: auto;
		flex-shrink: 0;
	}
</style>
