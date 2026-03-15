<script lang="ts">
	import type { SessionType } from '$lib/types';

	export let type: SessionType;

	const labelMap: Record<SessionType, string> = {
		claude: 'AI',
		terminal: 'TTY',
		shell: 'SH'
	};

	const colorMap: Record<SessionType, string> = {
		claude: 'var(--color-blue)',
		terminal: 'var(--color-orange)',
		shell: 'var(--color-text-muted)'
	};

	$: label = labelMap[type] ?? type;
	$: color = colorMap[type] ?? 'var(--color-text-muted)';
</script>

<span class="type-badge" style="color: {color};" aria-label="Session type: {type}">{label}</span>

<style>
	.type-badge {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.05em;
		padding: 1px var(--space-1);
		border-radius: var(--radius-sm);
		border: 1px solid currentColor;
		opacity: 0.8;
		flex-shrink: 0;
	}
</style>
