import { describe, it, expect } from 'vitest';
import { validateContainerName } from './new-container-modal-utils';

describe('validateContainerName', () => {
	it('rejects empty name', () => {
		const result = validateContainerName('');
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('rejects whitespace-only name', () => {
		const result = validateContainerName('   ');
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('accepts simple lowercase name', () => {
		expect(validateContainerName('my-project').valid).toBe(true);
	});

	it('accepts single letter', () => {
		expect(validateContainerName('a').valid).toBe(true);
	});

	it('accepts lowercase with numbers', () => {
		expect(validateContainerName('rust-v2').valid).toBe(true);
	});

	it('rejects uppercase letters', () => {
		const result = validateContainerName('My-Project');
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('rejects names starting with hyphen', () => {
		expect(validateContainerName('-project').valid).toBe(false);
	});

	it('rejects names ending with hyphen', () => {
		expect(validateContainerName('project-').valid).toBe(false);
	});

	it('rejects names with spaces', () => {
		expect(validateContainerName('my project').valid).toBe(false);
	});

	it('rejects names with underscores', () => {
		expect(validateContainerName('my_project').valid).toBe(false);
	});

	it('rejects names with special characters', () => {
		expect(validateContainerName('my.project').valid).toBe(false);
	});
});
