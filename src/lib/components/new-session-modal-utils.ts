import type { SessionType } from '$lib/types/session.js';

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

export function validateSessionName(name: string): ValidationResult {
	const trimmed = name.trim();
	if (!trimmed) {
		return { valid: false, error: 'Session name is required' };
	}
	if (trimmed.length > 100) {
		return { valid: false, error: 'Session name must be 100 characters or fewer' };
	}
	return { valid: true };
}

export interface SessionTypeOption {
	label: string;
	value: SessionType;
}

export const SESSION_TYPE_LABELS: SessionTypeOption[] = [
	{ label: 'Claude', value: 'claude' },
	{ label: 'Terminal', value: 'terminal' },
	{ label: 'Lisa Loop', value: 'shell' }
];

export function sessionTypeFromLabel(label: string): SessionType {
	const found = SESSION_TYPE_LABELS.find((t) => t.label === label);
	return found?.value ?? 'claude';
}
