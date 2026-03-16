<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Template } from '$lib/types/template.js';
	import type { Container } from '$lib/types/container.js';
	import { validateContainerName } from './new-container-modal-utils.js';

	export let open: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	// Template icons by template id
	const TEMPLATE_ICONS: Record<string, string> = {
		'tmpl-rust': '🦀',
		'tmpl-svelte': '⚡',
		'tmpl-python-ml': '🐍',
		'tmpl-blank': '📦'
	};

	type ClaudeMdSource = 'from-repo' | 'from-template' | 'none';

	// State
	let step: 0 | 1 = 0;
	let templates: Template[] = [];
	let templatesLoading = false;
	let templatesError = '';
	let selectedTemplateId = '';

	// Step 2 form state
	let name = '';
	let repoUrl = '';
	let claudeMdSource: ClaudeMdSource = 'from-repo';
	let extensions = '';
	let postCreateCommand = '';
	let nameError = '';
	let submitError = '';
	let submitting = false;

	$: selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

	async function loadTemplates(): Promise<void> {
		templatesLoading = true;
		templatesError = '';
		try {
			const res = await fetch('/api/templates');
			if (!res.ok) throw new Error('Failed to load templates');
			templates = await res.json();
			if (templates.length > 0 && !selectedTemplateId) {
				selectedTemplateId = templates[0].id;
			}
		} catch {
			templatesError = 'Could not load templates';
		} finally {
			templatesLoading = false;
		}
	}

	function handleOpen(): void {
		step = 0;
		name = '';
		repoUrl = '';
		claudeMdSource = 'from-repo';
		extensions = '';
		postCreateCommand = '';
		nameError = '';
		submitError = '';
		submitting = false;
		loadTemplates();
	}

	$: if (open) handleOpen();

	function handleClose(): void {
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	function setClaudeMdSource(value: string): void {
		claudeMdSource = value as ClaudeMdSource;
	}

	function goToStep1(): void {
		step = 1;
		nameError = '';
		submitError = '';
	}

	async function handleSubmit(): Promise<void> {
		const validation = validateContainerName(name);
		if (!validation.valid) {
			nameError = validation.error ?? 'Invalid container name';
			return;
		}
		nameError = '';
		submitError = '';
		submitting = true;

		const extensionList = extensions
			.split(',')
			.map((e) => e.trim())
			.filter(Boolean);

		try {
			const res = await fetch('/api/containers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					templateId: selectedTemplateId,
					config: {
						repoUrl: repoUrl.trim() || undefined,
						claudeMdSource,
						extensions: extensionList.length ? extensionList : undefined,
						postCreateCommand: postCreateCommand.trim() || undefined
					}
				})
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				submitError = (body as { error?: string }).error ?? 'Failed to create container';
				return;
			}

			const container: Container = await res.json();
			handleClose();
			await goto(`/containers/${container.id}`);
		} catch {
			submitError = 'Network error — please try again';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="New Container"
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div class="sheet" on:click|stopPropagation={() => {}}>
			{#if step === 0}
				<!-- Step 1: Template selection -->
				<h2 class="sheet-title">New Container</h2>
				<p class="sheet-subtitle">Choose a template to start from</p>

				{#if templatesLoading}
					<p class="loading-msg">Loading templates…</p>
				{:else if templatesError}
					<p class="error-msg">{templatesError}</p>
				{:else}
					<ul class="template-list" role="listbox" aria-label="Container templates">
						{#each templates as tmpl (tmpl.id)}
							<li>
								<button
									class="template-card"
									class:template-card--selected={selectedTemplateId === tmpl.id}
									role="option"
									aria-selected={selectedTemplateId === tmpl.id}
									on:click={() => (selectedTemplateId = tmpl.id)}
								>
									<span class="template-icon" aria-hidden="true">
										{TEMPLATE_ICONS[tmpl.id] ?? '📦'}
									</span>
									<div class="template-info">
										<span class="template-name">{tmpl.name}</span>
										<span class="template-desc">{tmpl.description}</span>
									</div>
								</button>
							</li>
						{/each}
					</ul>

					<button class="primary-btn" disabled={!selectedTemplateId} on:click={goToStep1}>
						Continue
					</button>
				{/if}
			{:else}
				<!-- Step 2: Configuration -->
				<div class="step2-header">
					<button
						class="back-btn"
						on:click={() => (step = 0)}
						aria-label="Back to template selection"
					>
						←
					</button>
					<h2 class="sheet-title">Configure</h2>
					{#if selectedTemplate}
						<span class="template-pill">{selectedTemplate.name}</span>
					{/if}
				</div>

				<form class="config-form" on:submit|preventDefault={handleSubmit}>
					<label class="field-label">
						Container Name
						<input
							class="field-input"
							class:field-input--error={!!nameError}
							type="text"
							placeholder="my-project"
							bind:value={name}
							autocomplete="off"
							spellcheck="false"
						/>
						{#if nameError}
							<span class="field-error" role="alert">{nameError}</span>
						{/if}
					</label>

					<label class="field-label">
						Git Repository
						<input
							class="field-input"
							type="text"
							placeholder="git@github.com:user/repo.git or blank for new"
							bind:value={repoUrl}
							autocomplete="off"
							spellcheck="false"
						/>
					</label>

					<fieldset class="field-group">
						<legend class="field-label-text">CLAUDE.md</legend>
						<div class="radio-group">
							{#each [['from-repo', 'From repo'], ['from-template', 'From template'], ['none', 'None']] as [val, label] (val)}
								<button
									type="button"
									class="radio-btn"
									class:radio-btn--active={claudeMdSource === val}
									on:click={() => setClaudeMdSource(val)}
									aria-pressed={claudeMdSource === val}
								>
									{label}
								</button>
							{/each}
						</div>
					</fieldset>

					<label class="field-label">
						VS Code Extensions (additional)
						<input
							class="field-input"
							type="text"
							placeholder="ext1, ext2, ..."
							bind:value={extensions}
							autocomplete="off"
							spellcheck="false"
						/>
					</label>

					<label class="field-label">
						Post-Create Command (additional)
						<input
							class="field-input"
							type="text"
							placeholder="pip install my-lib && ..."
							bind:value={postCreateCommand}
							autocomplete="off"
							spellcheck="false"
						/>
					</label>

					{#if submitError}
						<p class="error-msg" role="alert">{submitError}</p>
					{/if}

					<button class="primary-btn" type="submit" disabled={submitting}>
						{submitting ? 'Creating…' : 'Create & Launch'}
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: 100;
	}

	.sheet {
		background-color: var(--color-surface);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		width: 100%;
		max-width: 480px;
		padding: var(--space-6);
		border: 1px solid var(--color-border);
		border-bottom: none;
		max-height: 85vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.sheet-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.sheet-subtitle {
		font-size: 13px;
		color: var(--color-text-dim);
		margin: calc(var(--space-4) * -1) 0 0;
	}

	/* Template list */
	.template-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.template-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 14px var(--space-4);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		width: 100%;
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.template-card--selected {
		background-color: var(--color-accent-bg);
		border-color: var(--color-accent-dim);
	}

	.template-icon {
		font-size: 18px;
		width: 32px;
		text-align: center;
		flex-shrink: 0;
	}

	.template-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.template-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text);
		font-family: var(--font-sans);
	}

	.template-card--selected .template-name {
		color: var(--color-accent);
	}

	.template-desc {
		font-size: 12px;
		color: var(--color-text-dim);
		font-family: var(--font-sans);
	}

	/* Step 2 header */
	.step2-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.back-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 16px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.back-btn:hover {
		background-color: var(--color-surface-raised);
		color: var(--color-text);
	}

	.template-pill {
		font-size: 12px;
		font-weight: 500;
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		background-color: var(--color-accent-bg);
		color: var(--color-accent);
		border: 1px solid var(--color-accent-dim);
		font-family: var(--font-sans);
	}

	/* Form */
	.config-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.field-label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		font-family: var(--font-sans);
	}

	.field-label-text {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		font-family: var(--font-sans);
	}

	.field-input {
		display: block;
		width: 100%;
		padding: 10px var(--space-3);
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-family: var(--font-mono);
		font-size: 13px;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}

	.field-input:focus {
		border-color: var(--color-accent-dim);
	}

	.field-input--error {
		border-color: var(--color-red-dim);
	}

	.field-error {
		font-size: 11px;
		color: var(--color-red);
	}

	.field-group {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.radio-group {
		display: flex;
		gap: var(--space-2);
	}

	.radio-btn {
		flex: 1;
		padding: 9px 0;
		border-radius: var(--radius-md);
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.radio-btn--active {
		background-color: var(--color-blue-bg);
		border-color: var(--color-blue-dim);
		color: var(--color-blue);
	}

	/* Primary action button */
	.primary-btn {
		width: 100%;
		padding: 12px 0;
		border-radius: var(--radius-lg);
		background-color: var(--color-accent);
		border: none;
		color: var(--color-bg);
		font-family: var(--font-sans);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.primary-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	/* State messages */
	.loading-msg {
		font-size: 13px;
		color: var(--color-text-dim);
		text-align: center;
		padding: var(--space-4) 0;
		margin: 0;
		font-family: var(--font-sans);
	}

	.error-msg {
		font-size: 13px;
		color: var(--color-red);
		margin: 0;
		font-family: var(--font-sans);
	}
</style>
