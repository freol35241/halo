<script lang="ts">
	export let text: string;

	let open = false;

	function toggle(): void {
		open = !open;
	}
</script>

<div class="thinking-block">
	<button class="toggle" on:click={toggle} aria-expanded={open}>
		<span class="arrow" class:open>▸</span>
		Thinking
	</button>
	{#if open}
		<div class="thinking-content">{text}</div>
	{/if}
</div>

<style>
	.thinking-block {
		border-left: 2px solid var(--color-accent-dim);
		padding-left: var(--space-3);
		margin-bottom: var(--space-2);
	}

	.toggle {
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--color-accent-dim);
		padding: 0;
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.arrow {
		display: inline-block;
		transition: transform 0.15s;
	}

	.arrow.open {
		transform: rotate(90deg);
	}

	.thinking-content {
		font-family: var(--font-sans);
		font-size: 13px;
		color: var(--color-text-dim);
		line-height: 1.5;
		margin-top: var(--space-1);
		font-style: italic;
	}
</style>
