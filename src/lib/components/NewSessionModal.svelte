<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Container } from '$lib/types/container.js';
	import type { Session } from '$lib/types/session.js';
	import {
		validateSessionName,
		SESSION_TYPE_LABELS,
		type SessionTypeOption
	} from './new-session-modal-utils.js';

	export let open: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	// State
	let containers: Container[] = [];
	let containersLoading = false;
	let containersError = '';
	let selectedContainerId = '';
	let selectedType: SessionTypeOption = SESSION_TYPE_LABELS[0];
	let name = '';
	let nameError = '';
	let submitError = '';
	let submitting = false;

	async function loadContainers(): Promise<void> {
		containersLoading = true;
		containersError = '';
		try {
			const res = await fetch('/api/containers');
			if (!res.ok) throw new Error('Failed to load containers');
			const all: Container[] = await res.json();
			containers = all.filter((c) => c.status === 'running');
			if (containers.length > 0 && !selectedContainerId) {
				selectedContainerId = containers[0].id;
			}
		} catch {
			containersError = 'Could not load containers';
		} finally {
			containersLoading = false;
		}
	}

	function handleOpen(): void {
		name = '';
		nameError = '';
		submitError = '';
		submitting = false;
		selectedType = SESSION_TYPE_LABELS[0];
		selectedContainerId = '';
		containers = [];
		loadContainers();
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

	async function handleSubmit(): Promise<void> {
		const validation = validateSessionName(name);
		if (!validation.valid) {
			nameError = validation.error ?? 'Invalid session name';
			return;
		}
		if (!selectedContainerId) {
			submitError = 'Please select a container';
			return;
		}
		nameError = '';
		submitError = '';
		submitting = true;

		try {
			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					type: selectedType.value,
					containerId: selectedContainerId
				})
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				submitError = (body as { error?: string }).error ?? 'Failed to create session';
				return;
			}

			const session: Session = await res.json();
			handleClose();
			await goto(`/sessions/${session.id}`);
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
		aria-label="New Session"
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div class="sheet" on:click|stopPropagation={() => {}}>
			<h2 class="sheet-title">New Session</h2>

			<form class="form" on:submit|preventDefault={handleSubmit}>
				<!-- Container selection -->
				<div class="field-label">
					<span class="field-label-text">Container</span>
					{#if containersLoading}
						<span class="loading-msg">Loading containers…</span>
					{:else if containersError}
						<span class="error-inline" role="alert">{containersError}</span>
					{:else if containers.length === 0}
						<span class="empty-msg">No running containers</span>
					{:else}
						<label class="visually-hidden" for="session-container-select">Container</label>
						<select
							id="session-container-select"
							class="field-select"
							bind:value={selectedContainerId}
						>
							{#each containers as container (container.id)}
								<option value={container.id}>{container.name}</option>
							{/each}
						</select>
					{/if}
				</div>

				<!-- Session type -->
				<fieldset class="field-group">
					<legend class="field-label-text">Session Type</legend>
					<div class="type-group" role="group" aria-label="Session type">
						{#each SESSION_TYPE_LABELS as typeOption (typeOption.value)}
							<button
								type="button"
								class="type-btn"
								class:type-btn--active={selectedType.value === typeOption.value}
								aria-pressed={selectedType.value === typeOption.value}
								on:click={() => (selectedType = typeOption)}
							>
								{typeOption.label}
							</button>
						{/each}
					</div>
				</fieldset>

				<!-- Name -->
				<label class="field-label">
					Name
					<input
						class="field-input"
						class:field-input--error={!!nameError}
						type="text"
						placeholder="Weather Routing Solver"
						bind:value={name}
						autocomplete="off"
						spellcheck="false"
					/>
					{#if nameError}
						<span class="field-error" role="alert">{nameError}</span>
					{/if}
				</label>

				{#if submitError}
					<p class="error-msg" role="alert">{submitError}</p>
				{/if}

				<button class="primary-btn" type="submit" disabled={submitting || containers.length === 0}>
					{submitting ? 'Launching…' : 'Launch'}
				</button>
			</form>
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

	.form {
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

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.field-select {
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
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.field-select:focus {
		border-color: var(--color-accent-dim);
	}

	.field-input {
		display: block;
		width: 100%;
		padding: 10px var(--space-3);
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-family: var(--font-sans);
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

	.type-group {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}

	.type-btn {
		flex: 1;
		padding: 10px 0;
		border-radius: var(--radius-md);
		background-color: var(--color-surface-raised);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.type-btn--active {
		background-color: var(--color-blue-bg);
		border-color: var(--color-blue-dim);
		color: var(--color-blue);
	}

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

	.loading-msg {
		font-size: 13px;
		color: var(--color-text-dim);
		padding: var(--space-2) 0;
		font-family: var(--font-sans);
	}

	.empty-msg {
		font-size: 13px;
		color: var(--color-text-dim);
		padding: var(--space-2) 0;
		font-family: var(--font-sans);
		font-style: italic;
	}

	.error-inline {
		font-size: 12px;
		color: var(--color-red);
	}

	.error-msg {
		font-size: 13px;
		color: var(--color-red);
		margin: 0;
		font-family: var(--font-sans);
	}
</style>
