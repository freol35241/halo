<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import type { FeedEntry } from '$lib/types/feed.js';
	import { createSessionStream, type SessionStream } from '$lib/stores/session-stream.js';
	import SessionFeed from '$lib/components/feed/SessionFeed.svelte';
	import InputBar from '$lib/components/feed/InputBar.svelte';
	import QuickCommands from '$lib/components/feed/QuickCommands.svelte';
	import TerminalView from '$lib/components/TerminalView.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import TypeBadge from '$lib/components/TypeBadge.svelte';

	export let data: PageData;

	$: session = data.session;
	$: initialEntries = data.feedEntries ?? [];

	// Subscribe to SSE stream for live updates (non-terminal sessions)
	let stream: SessionStream | null = null;
	let liveEntries: FeedEntry[] = [];
	let unsubStream: (() => void) | null = null;

	$: {
		unsubStream?.();
		liveEntries = [];
		if (session && session.type !== 'terminal') {
			stream = createSessionStream(session.id);
			unsubStream = stream.subscribe((state) => {
				liveEntries = state.entries;
			});
		} else {
			stream?.destroy();
			stream = null;
			unsubStream = null;
		}
	}

	$: allEntries = [...initialEntries, ...liveEntries];
	$: isRunning = session?.status === 'running';

	async function handleSubmit(event: CustomEvent<string>): Promise<void> {
		if (!session) return;
		await fetch(`/api/sessions/${session.id}/input`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content: event.detail })
		});
	}

	const quickCommands = ['git status', 'git log --oneline -5', 'ls -la', 'pwd'];

	onDestroy(() => {
		unsubStream?.();
		stream?.destroy();
	});
</script>

<svelte:head>
	<title>{session ? `${session.name} — HALO` : 'Session — HALO'}</title>
</svelte:head>

{#if data.error}
	<div class="error-state">
		<a class="back-link" href="/" aria-label="Back to home">
			<svg
				width="16"
				height="16"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<polyline points="10,2 4,8 10,14" />
			</svg>
			Back
		</a>
		<p class="error-message">{data.error}</p>
	</div>
{:else if session}
	<div class="session-view">
		<!-- Session header -->
		<header class="session-header">
			<a class="back-link" href="/" aria-label="Back to home">
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<polyline points="10,2 4,8 10,14" />
				</svg>
			</a>
			<div class="header-info">
				<span class="session-name">{session.name}</span>
				<div class="header-meta">
					<TypeBadge type={session.type} />
					<StatusPill status={session.status} />
				</div>
			</div>
		</header>

		<!-- Content area -->
		{#if session.type === 'terminal'}
			<div class="terminal-wrapper">
				<TerminalView sessionId={session.id} />
			</div>
		{:else}
			<SessionFeed entries={allEntries} {isRunning} />
			<QuickCommands commands={quickCommands} on:select={(e) => handleSubmit(e)} />
			<InputBar sessionType={session.type} on:submit={handleSubmit} />
		{/if}
	</div>
{/if}

<style>
	.session-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.session-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 13px;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		text-decoration: none;
		flex-shrink: 0;
	}

	.back-link:hover {
		color: var(--color-text);
		background-color: var(--color-sidebar-hover);
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.session-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		font-family: var(--font-sans);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.terminal-wrapper {
		flex: 1;
		overflow: hidden;
	}

	.error-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-6);
		font-family: var(--font-sans);
	}

	.error-message {
		color: var(--color-text-muted);
		margin: 0;
	}
</style>
