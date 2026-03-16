export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates a container name: lowercase letters, numbers, and hyphens only.
 * Must not start or end with a hyphen.
 */
export function validateContainerName(name: string): ValidationResult {
	const trimmed = name.trim();
	if (!trimmed) {
		return { valid: false, error: 'Container name is required' };
	}
	if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmed)) {
		return {
			valid: false,
			error:
				'Container name must use lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)'
		};
	}
	return { valid: true };
}
