<script lang="ts">
	import { afterUpdate } from 'svelte';
	import type { FeedEntry } from '$lib/types/feed';
	import HumanEntry from './HumanEntry.svelte';
	import AssistantEntry from './AssistantEntry.svelte';
	import ToolEntry from './ToolEntry.svelte';
	import CommandEntry from './CommandEntry.svelte';
	import OutputEntry from './OutputEntry.svelte';
	import SystemEntry from './SystemEntry.svelte';

	export let entries: FeedEntry[];
	export let isRunning: boolean = false;

	let feedEl: HTMLDivElement;

	afterUpdate(() => {
		if (feedEl) {
			feedEl.scrollTop = feedEl.scrollHeight;
		}
	});
</script>

<div class="session-feed" data-testid="session-feed" bind:this={feedEl}>
	{#each entries as entry (entry.id)}
		{#if entry.role === 'human'}
			<HumanEntry {entry} />
		{:else if entry.role === 'assistant'}
			<AssistantEntry {entry} />
		{:else if entry.role === 'tool'}
			<ToolEntry {entry} />
		{:else if entry.role === 'command'}
			<CommandEntry {entry} />
		{:else if entry.role === 'output'}
			<OutputEntry {entry} />
		{:else if entry.role === 'system'}
			<SystemEntry {entry} />
		{/if}
	{/each}

	{#if isRunning}
		<div class="running-indicator">
			<span class="pulse">●</span>
			<span class="running-text">Running...</span>
		</div>
	{/if}
</div>

<style>
	.session-feed {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) var(--space-4) var(--space-2);
	}

	.running-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) 0;
		color: var(--color-orange);
	}

	.pulse {
		animation: pulse 1.5s ease-in-out infinite;
		font-size: 8px;
	}

	.running-text {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-muted);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
</style>
