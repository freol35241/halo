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

<div class="human-entry" data-role="human">
	<div class="header">
		<span class="ts" data-testid="human-ts">{formatTs(entry.ts)}</span>
		<span class="label">you</span>
	</div>
	<div class="content">{entry.content}</div>
</div>

<style>
	.human-entry {
		background-color: var(--color-human);
		border-radius: var(--radius-xl);
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-3);
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-bottom: var(--space-1);
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
		color: var(--color-blue);
	}

	.content {
		font-family: var(--font-sans);
		font-size: 14px;
		color: var(--color-text);
		line-height: 1.6;
	}
</style>
