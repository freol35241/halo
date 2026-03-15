<script lang="ts">
	const title = 'HALO';
	const subtitle = 'Hosted Agentic Loop Orchestration';
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="welcome">
	<h1>{title}</h1>
	<p>{subtitle}</p>
</div>

<style>
	.welcome {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 300px;
		color: var(--color-text);
		font-family: var(--font-sans);
	}

	h1 {
		font-size: 2rem;
		color: var(--color-accent);
		margin-bottom: 0.5rem;
	}

	p {
		color: var(--color-text-muted);
	}
</style>
