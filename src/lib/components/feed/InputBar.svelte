<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { SessionType } from '$lib/types/session';

	export let sessionType: SessionType;
	export let value: string = '';

	const dispatch = createEventDispatcher<{ submit: string }>();

	$: isCommandMode = sessionType !== 'claude';
	$: placeholder = isCommandMode ? 'Enter command...' : 'Message Claude...';

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}

	function submit(): void {
		const trimmed = value.trim();
		if (trimmed) {
			dispatch('submit', trimmed);
			value = '';
		}
	}
</script>

<div class="input-bar">
	<div class="input-wrapper">
		{#if isCommandMode}
			<span class="prompt">$</span>
		{/if}
		<input
			bind:value
			{placeholder}
			class:monospace={isCommandMode}
			on:keydown={handleKeydown}
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck={!isCommandMode}
		/>
		<button
			class="send-btn"
			class:active={value.length > 0}
			on:click={submit}
			aria-label="Send"
			disabled={value.length === 0}
		>
			↑
		</button>
	</div>
</div>

<style>
	.input-bar {
		padding: var(--space-2) var(--space-3) var(--space-3);
		border-top: 1px solid var(--color-border);
		background-color: var(--color-surface);
		flex-shrink: 0;
	}

	.input-wrapper {
		display: flex;
		align-items: flex-end;
		gap: var(--space-2);
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-2) var(--space-3);
	}

	.prompt {
		font-family: var(--font-mono);
		font-size: 14px;
		color: var(--color-green);
		line-height: 24px;
		flex-shrink: 0;
	}

	input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: var(--color-text);
		font-family: var(--font-sans);
		font-size: 14px;
		line-height: 24px;
		padding: 0;
	}

	input.monospace {
		font-family: var(--font-mono);
	}

	input::placeholder {
		color: var(--color-text-dim);
	}

	.send-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-lg);
		background-color: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-dim);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.send-btn.active {
		background-color: var(--color-accent);
		border-color: transparent;
		color: var(--color-bg);
	}

	.send-btn:disabled {
		cursor: default;
	}
</style>
