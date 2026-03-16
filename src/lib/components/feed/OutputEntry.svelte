<script lang="ts">
	import type { FeedEntry } from '$lib/types/feed';

	export let entry: FeedEntry;
</script>

<div class="output-entry" data-role="output">
	<pre class="output">{entry.content}</pre>
</div>

<style>
	.output-entry {
		margin-bottom: var(--space-1);
		padding: 6px var(--space-3) 6px 22px;
	}

	.output {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-muted);
		line-height: 1.6;
		white-space: pre-wrap;
	}
</style>
