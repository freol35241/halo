import { describe, it, expect } from 'vitest';
import { validateContainerName, validateSessionType, validateRequired } from './validation.js';

describe('validateContainerName', () => {
	it('accepts valid names', () => {
		expect(validateContainerName('my-container').success).toBe(true);
		expect(validateContainerName('abc').success).toBe(true);
		expect(validateContainerName('rust-dev-01').success).toBe(true);
		expect(validateContainerName('a'.repeat(63)).success).toBe(true);
	});

	it('rejects names shorter than 3 characters', () => {
		const result = validateContainerName('ab');
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toMatch(/3/);
	});

	it('rejects names longer than 63 characters', () => {
		const result = validateContainerName('a'.repeat(64));
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toMatch(/63/);
	});

	it('rejects names with invalid characters', () => {
		expect(validateContainerName('my_container').success).toBe(false);
		expect(validateContainerName('my container').success).toBe(false);
		expect(validateContainerName('my.container').success).toBe(false);
		expect(validateContainerName('MY-CONTAINER').success).toBe(true);
	});

	it('rejects empty string', () => {
		expect(validateContainerName('').success).toBe(false);
	});
});

describe('validateSessionType', () => {
	it('accepts valid session types', () => {
		expect(validateSessionType('claude').success).toBe(true);
		expect(validateSessionType('terminal').success).toBe(true);
		expect(validateSessionType('shell').success).toBe(true);
	});

	it('rejects invalid session types', () => {
		expect(validateSessionType('invalid').success).toBe(false);
		expect(validateSessionType('').success).toBe(false);
		expect(validateSessionType('Claude').success).toBe(false);
	});

	it('returns the typed value on success', () => {
		const result = validateSessionType('claude');
		expect(result.success).toBe(true);
		if (result.success) expect(result.value).toBe('claude');
	});
});

describe('validateRequired', () => {
	it('accepts non-empty strings', () => {
		expect(validateRequired('hello', 'field').success).toBe(true);
		expect(validateRequired(' trimmed ', 'field').success).toBe(true);
	});

	it('rejects empty string', () => {
		const result = validateRequired('', 'myField');
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error).toContain('myField');
	});

	it('rejects whitespace-only string', () => {
		const result = validateRequired('   ', 'myField');
		expect(result.success).toBe(false);
	});
});
