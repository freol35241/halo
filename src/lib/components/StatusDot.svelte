<script lang="ts">
	import type { ContainerStatus, SessionStatus } from '$lib/types';

	export let status: ContainerStatus | SessionStatus;

	const colorMap: Record<string, string> = {
		running: 'var(--color-green)',
		idle: 'var(--color-blue-dim)',
		creating: 'var(--color-orange)',
		stopped: 'var(--color-red)',
		destroyed: 'var(--color-text-dim)',
		error: 'var(--color-red)'
	};

	$: color = colorMap[status] ?? 'var(--color-text-dim)';
</script>

<span class="status-dot" style="background-color: {color};" aria-label="Status: {status}" role="img"
></span>

<style>
	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}
</style>
