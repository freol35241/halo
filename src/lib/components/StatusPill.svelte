<script lang="ts">
	import type { ContainerStatus, SessionStatus } from '$lib/types';

	export let status: ContainerStatus | SessionStatus;

	const labelMap: Record<string, string> = {
		running: 'Running',
		idle: 'Idle',
		creating: 'Creating',
		stopped: 'Stopped',
		destroyed: 'Destroyed',
		error: 'Error'
	};

	const variantMap: Record<string, string> = {
		running: 'green',
		idle: 'blue',
		creating: 'orange',
		stopped: 'red',
		destroyed: 'dim',
		error: 'red'
	};

	$: label = labelMap[status] ?? status;
	$: variant = variantMap[status] ?? 'dim';
</script>

<span class="status-pill status-pill--{variant}">{label}</span>

<style>
	.status-pill {
		display: inline-block;
		font-size: 11px;
		font-weight: 500;
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
	}

	.status-pill--green {
		color: var(--color-green);
		background-color: var(--color-green-bg);
	}

	.status-pill--blue {
		color: var(--color-blue);
		background-color: var(--color-blue-bg);
	}

	.status-pill--orange {
		color: var(--color-orange);
		background-color: var(--color-orange-bg);
	}

	.status-pill--red {
		color: var(--color-red);
		background-color: var(--color-red-bg);
	}

	.status-pill--dim {
		color: var(--color-text-muted);
		background-color: var(--color-surface);
	}
</style>
