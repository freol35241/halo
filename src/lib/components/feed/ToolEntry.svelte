<script lang="ts">
	import type { FeedEntry } from '$lib/types/feed';

	export let entry: FeedEntry;

	let open = false;

	function toggle(): void {
		open = !open;
	}

	$: tool = entry.metadata?.tool ?? '';
	$: path = entry.metadata?.path ?? '';
</script>

<div class="tool-entry" data-role="tool">
	<button class="header" on:click={toggle} aria-expanded={open}>
		<span class="tool-name">{tool}</span>
		<span class="tool-path">{path}</span>
		<span class="arrow" class:open>▸</span>
	</button>
	{#if open}
		<pre class="code">{entry.content}</pre>
	{/if}
</div>

<style>
	.tool-entry {
		background-color: var(--color-code);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		margin-bottom: var(--space-2);
		overflow: hidden;
	}

	.header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.tool-name {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-blue);
		flex-shrink: 0;
	}

	.tool-path {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-muted);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.arrow {
		display: inline-block;
		transition: transform 0.15s;
		color: var(--color-text-dim);
		font-size: 12px;
		flex-shrink: 0;
	}

	.arrow.open {
		transform: rotate(90deg);
	}

	.code {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-muted);
		line-height: 1.6;
		overflow-x: auto;
		white-space: pre-wrap;
	}
</style>
