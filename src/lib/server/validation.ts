import type { SessionType } from '$lib/types/session.js';

type ValidationSuccess<T> = { success: true; value: T };
type ValidationFailure = { success: false; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateContainerName(name: string): ValidationResult<string> {
	if (name.length < 3) {
		return { success: false, error: 'Container name must be at least 3 characters' };
	}
	if (name.length > 63) {
		return { success: false, error: 'Container name must be at most 63 characters' };
	}
	if (!/^[a-zA-Z0-9-]+$/.test(name)) {
		return {
			success: false,
			error: 'Container name may only contain alphanumeric characters and hyphens'
		};
	}
	return { success: true, value: name };
}

const VALID_SESSION_TYPES: SessionType[] = ['claude', 'terminal', 'shell'];

export function validateSessionType(type: string): ValidationResult<SessionType> {
	if ((VALID_SESSION_TYPES as string[]).includes(type)) {
		return { success: true, value: type as SessionType };
	}
	return {
		success: false,
		error: `Session type must be one of: ${VALID_SESSION_TYPES.join(', ')}`
	};
}

export function validateRequired(value: string, fieldName: string): ValidationResult<string> {
	if (value.trim().length === 0) {
		return { success: false, error: `${fieldName} is required` };
	}
	return { success: true, value };
}
