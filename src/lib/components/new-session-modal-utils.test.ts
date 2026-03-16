import { describe, it, expect } from 'vitest';
import {
	validateSessionName,
	SESSION_TYPE_LABELS,
	sessionTypeFromLabel
} from './new-session-modal-utils';

describe('validateSessionName', () => {
	it('rejects empty name', () => {
		const result = validateSessionName('');
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('rejects whitespace-only name', () => {
		const result = validateSessionName('   ');
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('accepts a simple name', () => {
		expect(validateSessionName('My session').valid).toBe(true);
	});

	it('accepts names with spaces and mixed case', () => {
		expect(validateSessionName('Implement auth module').valid).toBe(true);
	});

	it('accepts names with special characters', () => {
		expect(validateSessionName('fix: bug #42').valid).toBe(true);
	});

	it('rejects name exceeding 100 characters', () => {
		const long = 'a'.repeat(101);
		const result = validateSessionName(long);
		expect(result.valid).toBe(false);
		expect(result.error).toBeTruthy();
	});

	it('accepts name at exactly 100 characters', () => {
		const exact = 'a'.repeat(100);
		expect(validateSessionName(exact).valid).toBe(true);
	});
});

describe('SESSION_TYPE_LABELS', () => {
	it('has entries for all three session types', () => {
		expect(SESSION_TYPE_LABELS).toHaveLength(3);
	});

	it('includes Claude label', () => {
		const labels = SESSION_TYPE_LABELS.map((t) => t.label);
		expect(labels).toContain('Claude');
	});

	it('includes Terminal label', () => {
		const labels = SESSION_TYPE_LABELS.map((t) => t.label);
		expect(labels).toContain('Terminal');
	});

	it('includes Lisa Loop label', () => {
		const labels = SESSION_TYPE_LABELS.map((t) => t.label);
		expect(labels).toContain('Lisa Loop');
	});
});

describe('sessionTypeFromLabel', () => {
	it('returns claude for Claude', () => {
		expect(sessionTypeFromLabel('Claude')).toBe('claude');
	});

	it('returns terminal for Terminal', () => {
		expect(sessionTypeFromLabel('Terminal')).toBe('terminal');
	});

	it('returns shell for Lisa Loop', () => {
		expect(sessionTypeFromLabel('Lisa Loop')).toBe('shell');
	});
});
