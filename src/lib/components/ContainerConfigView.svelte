<script lang="ts">
	import type { Container } from '$lib/types/container.js';
	import StatusPill from './StatusPill.svelte';
	import VSCodeOverlay from './VSCodeOverlay.svelte';

	export let container: Container;

	type Tab = 'overview' | 'devcontainer' | 'env' | 'ports';
	let activeTab: Tab = 'overview';
	let showVSCodeOverlay = false;

	// Env editing state
	let newEnvKey = '';
	let newEnvValue = '';
	let envError = '';

	// Local copy of env vars for editing
	let envVars: Record<string, string> = { ...(container.config.env ?? {}) };

	// Start/stop/action state
	let actionLoading = false;
	let actionError = '';

	async function handleStart(): Promise<void> {
		actionLoading = true;
		actionError = '';
		try {
			const res = await fetch(`/api/containers/${container.id}/start`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json();
				actionError = body.error ?? 'Failed to start container';
			} else {
				const updated: Container = await res.json();
				container = updated;
			}
		} catch {
			actionError = 'Network error';
		} finally {
			actionLoading = false;
		}
	}

	async function handleStop(): Promise<void> {
		actionLoading = true;
		actionError = '';
		try {
			const res = await fetch(`/api/containers/${container.id}/stop`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json();
				actionError = body.error ?? 'Failed to stop container';
			} else {
				const updated: Container = await res.json();
				container = updated;
			}
		} catch {
			actionError = 'Network error';
		} finally {
			actionLoading = false;
		}
	}

	function addEnvVar(): void {
		const key = newEnvKey.trim();
		const value = newEnvValue.trim();
		if (!key) {
			envError = 'Key is required';
			return;
		}
		envError = '';
		envVars = { ...envVars, [key]: value };
		newEnvKey = '';
		newEnvValue = '';
	}

	function removeEnvVar(key: string): void {
		const updated = { ...envVars };
		delete updated[key];
		envVars = updated;
	}

	$: devcontainerJson = JSON.stringify(
		{
			image: container.config.image,
			containerEnv: container.config.env,
			forwardPorts: container.config.ports,
			mounts: container.config.mounts,
			customizations: container.config.extensions?.length
				? { vscode: { extensions: container.config.extensions } }
				: undefined,
			postCreateCommand: container.config.postCreateCommand
		},
		null,
		2
	);

	$: ports = container.config.ports ?? [];
	$: repoUrl = container.config.repoUrl ?? null;
</script>

<div class="container-config">
	<!-- Header -->
	<header class="config-header">
		<button class="back-btn" on:click={() => history.back()} aria-label="Back">
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
		</button>

		<div class="header-info">
			<h1 class="container-name">{container.name}</h1>
			<StatusPill status={container.status} />
		</div>

		<button
			class="vscode-btn"
			on:click={() => (showVSCodeOverlay = true)}
			aria-label="Open VS Code"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<rect x="1" y="1" width="12" height="12" rx="2" />
				<path d="M5 4l4 3-4 3" />
			</svg>
			VS Code
		</button>
	</header>

	<!-- Tabs -->
	<div class="tabs" role="tablist" aria-label="Container configuration tabs">
		<button
			role="tab"
			aria-selected={activeTab === 'overview'}
			aria-controls="tab-panel"
			class="tab-btn"
			class:tab-btn--active={activeTab === 'overview'}
			on:click={() => (activeTab = 'overview')}
		>
			Overview
		</button>
		<button
			role="tab"
			aria-selected={activeTab === 'devcontainer'}
			aria-controls="tab-panel"
			class="tab-btn"
			class:tab-btn--active={activeTab === 'devcontainer'}
			on:click={() => (activeTab = 'devcontainer')}
		>
			devcontainer.json
		</button>
		<button
			role="tab"
			aria-selected={activeTab === 'env'}
			aria-controls="tab-panel"
			class="tab-btn"
			class:tab-btn--active={activeTab === 'env'}
			on:click={() => (activeTab = 'env')}
		>
			Env
		</button>
		<button
			role="tab"
			aria-selected={activeTab === 'ports'}
			aria-controls="tab-panel"
			class="tab-btn"
			class:tab-btn--active={activeTab === 'ports'}
			on:click={() => (activeTab = 'ports')}
		>
			Ports
		</button>
	</div>

	<!-- Tab panel -->
	<div id="tab-panel" class="tab-content" role="tabpanel">
		{#if activeTab === 'overview'}
			<!-- Overview -->
			<section class="overview-section">
				<!-- Controls -->
				<div class="controls">
					{#if container.status === 'stopped'}
						<button
							class="ctrl-btn ctrl-btn--start"
							on:click={handleStart}
							disabled={actionLoading}
						>
							{actionLoading ? 'Starting…' : 'Start'}
						</button>
					{:else if container.status === 'running'}
						<button class="ctrl-btn ctrl-btn--stop" on:click={handleStop} disabled={actionLoading}>
							{actionLoading ? 'Stopping…' : 'Stop'}
						</button>
					{/if}
					<button class="ctrl-btn" disabled title="Rebuild not yet implemented">Rebuild</button>
				</div>

				{#if actionError}
					<p class="action-error">{actionError}</p>
				{/if}

				<!-- Repo -->
				{#if repoUrl}
					<div class="info-row">
						<span class="info-label">Repository</span>
						<a href={repoUrl} class="info-link" target="_blank" rel="noopener">{repoUrl}</a>
					</div>
				{/if}

				<!-- Template -->
				<div class="info-row">
					<span class="info-label">Template</span>
					<span class="info-value">{container.templateId}</span>
				</div>

				<!-- Created -->
				<div class="info-row">
					<span class="info-label">Created</span>
					<span class="info-value">{new Date(container.createdAt).toLocaleDateString()}</span>
				</div>

				<!-- Tools & extensions -->
				{#if container.config.extensions?.length}
					<div class="section-group">
						<h3 class="group-title">Extensions</h3>
						<ul class="tag-list">
							{#each container.config.extensions as ext (ext)}
								<li class="tag">{ext}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Post-create command -->
				{#if container.config.postCreateCommand}
					<div class="section-group">
						<h3 class="group-title">Post-Create Command</h3>
						<code class="code-block">{container.config.postCreateCommand}</code>
					</div>
				{/if}
			</section>
		{:else if activeTab === 'devcontainer'}
			<!-- devcontainer.json viewer -->
			<section class="devcontainer-section">
				<h3 class="section-title">devcontainer.json</h3>
				<pre class="json-viewer"><code>{devcontainerJson}</code></pre>
			</section>
		{:else if activeTab === 'env'}
			<!-- Env variables -->
			<section class="env-section">
				<h3 class="section-title">Environment Variables</h3>

				{#if Object.keys(envVars).length > 0}
					<ul class="env-list">
						{#each Object.entries(envVars) as [key, value] (key)}
							<li class="env-row">
								<span class="env-key">{key}</span>
								<span class="env-equals">=</span>
								<span class="env-value">{value}</span>
								<button
									class="env-remove-btn"
									on:click={() => removeEnvVar(key)}
									aria-label="Remove {key}"
								>
									×
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty-state">No environment variables set.</p>
				{/if}

				<!-- Add new env var -->
				<div class="env-add-form">
					<h4 class="add-title">Add Variable</h4>
					{#if envError}
						<p class="field-error">{envError}</p>
					{/if}
					<div class="env-add-row">
						<input
							class="env-input"
							type="text"
							placeholder="KEY"
							bind:value={newEnvKey}
							aria-label="Environment variable key"
						/>
						<span class="env-equals">=</span>
						<input
							class="env-input env-input--value"
							type="text"
							placeholder="value"
							bind:value={newEnvValue}
							aria-label="Environment variable value"
						/>
						<button class="add-btn" on:click={addEnvVar}>Add</button>
					</div>
				</div>
			</section>
		{:else if activeTab === 'ports'}
			<!-- Ports -->
			<section class="ports-section">
				<h3 class="section-title">Forwarded Ports</h3>

				{#if ports.length > 0}
					<ul class="ports-list">
						{#each ports as port (port)}
							<li class="port-row">
								<span class="port-number">{port}</span>
								<span class="port-url">
									<a
										href="/port/{container.name}/{port}/"
										target="_blank"
										rel="noopener"
										class="port-link"
									>
										/port/{container.name}/{port}/
									</a>
								</span>
								<span
									class="port-status"
									class:port-status--active={container.status === 'running'}
								>
									{container.status === 'running' ? 'Active' : 'Inactive'}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty-state">No forwarded ports configured.</p>
				{/if}
			</section>
		{/if}
	</div>
</div>

{#if showVSCodeOverlay}
	<VSCodeOverlay containerName={container.name} onClose={() => (showVSCodeOverlay = false)} />
{/if}

<style>
	.container-config {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--color-bg);
		color: var(--color-text);
		font-family: var(--font-sans);
	}

	/* Header */
	.config-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.back-btn {
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
		flex-shrink: 0;
	}

	.back-btn:hover {
		color: var(--color-text);
		background-color: var(--color-sidebar-hover);
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: 1;
		min-width: 0;
	}

	.container-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.vscode-btn {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: none;
		color: var(--color-text-muted);
		font-size: 12px;
		font-family: var(--font-sans);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.vscode-btn:hover {
		background-color: var(--color-sidebar-hover);
		color: var(--color-text);
	}

	/* Tabs */
	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border);
		background-color: var(--color-surface);
		overflow-x: auto;
		flex-shrink: 0;
	}

	.tab-btn {
		padding: var(--space-3) var(--space-4);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 13px;
		white-space: nowrap;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.tab-btn:hover {
		color: var(--color-text);
	}

	.tab-btn--active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	/* Tab content */
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4);
	}

	/* Overview */
	.overview-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.controls {
		display: flex;
		gap: var(--space-2);
	}

	.ctrl-btn {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 13px;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.ctrl-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ctrl-btn--start {
		border-color: var(--color-green-dim);
		color: var(--color-green);
	}

	.ctrl-btn--start:hover:not(:disabled) {
		background-color: var(--color-green-bg);
	}

	.ctrl-btn--stop {
		border-color: var(--color-red-dim);
		color: var(--color-red);
	}

	.ctrl-btn--stop:hover:not(:disabled) {
		background-color: var(--color-red-bg);
	}

	.action-error {
		color: var(--color-red);
		font-size: 13px;
		margin: 0;
	}

	.info-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
	}

	.info-label {
		font-size: 12px;
		color: var(--color-text-dim);
		min-width: 90px;
		flex-shrink: 0;
	}

	.info-value {
		font-size: 13px;
		color: var(--color-text);
	}

	.info-link {
		font-size: 13px;
		color: var(--color-blue);
		text-decoration: none;
		overflow-wrap: break-word;
	}

	.info-link:hover {
		text-decoration: underline;
	}

	.section-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.group-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.tag-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.tag {
		font-size: 11px;
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		background-color: var(--color-surface-raised);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
	}

	.code-block {
		font-family: var(--font-mono);
		font-size: 12px;
		background-color: var(--color-code);
		color: var(--color-text);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		display: block;
		overflow-x: auto;
	}

	/* Devcontainer */
	.devcontainer-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.section-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-dim);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: 0;
	}

	.json-viewer {
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.6;
		background-color: var(--color-code);
		color: var(--color-text);
		padding: var(--space-4);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: 0;
		border: 1px solid var(--color-border);
	}

	.json-viewer code {
		font-family: inherit;
	}

	/* Env */
	.env-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.env-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.env-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background-color: var(--color-surface);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.env-key {
		color: var(--color-accent);
		flex-shrink: 0;
	}

	.env-equals {
		color: var(--color-text-dim);
		flex-shrink: 0;
	}

	.env-value {
		color: var(--color-text);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.env-remove-btn {
		background: none;
		border: none;
		color: var(--color-text-dim);
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		padding: 0 var(--space-1);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.env-remove-btn:hover {
		color: var(--color-red);
		background-color: var(--color-red-bg);
	}

	.env-add-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background-color: var(--color-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.add-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-dim);
		margin: 0;
	}

	.env-add-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.env-input {
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 12px;
		padding: var(--space-1) var(--space-2);
		width: 120px;
	}

	.env-input--value {
		flex: 1;
		width: auto;
	}

	.env-input:focus {
		outline: none;
		border-color: var(--color-accent-dim);
	}

	.add-btn {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-accent-dim);
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-accent);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 12px;
		white-space: nowrap;
	}

	.add-btn:hover {
		background-color: var(--color-accent-bg);
	}

	.field-error {
		font-size: 12px;
		color: var(--color-red);
		margin: 0;
	}

	/* Ports */
	.ports-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.ports-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.port-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background-color: var(--color-surface);
		border-radius: var(--radius-md);
	}

	.port-number {
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--color-text);
		min-width: 60px;
		flex-shrink: 0;
	}

	.port-url {
		flex: 1;
	}

	.port-link {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-blue);
		text-decoration: none;
	}

	.port-link:hover {
		text-decoration: underline;
	}

	.port-status {
		font-size: 11px;
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		background-color: var(--color-red-bg);
		color: var(--color-red);
		flex-shrink: 0;
	}

	.port-status--active {
		background-color: var(--color-green-bg);
		color: var(--color-green);
	}

	/* Shared */
	.empty-state {
		font-size: 13px;
		color: var(--color-text-dim);
		margin: 0;
		padding: var(--space-4) 0;
	}
</style>
