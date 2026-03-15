import { describe, it, expect } from 'vitest';
import { BUILT_IN_TEMPLATES, getTemplateById, validateTemplate } from './index.js';
import type { Template } from '$lib/types/template.js';

describe('BUILT_IN_TEMPLATES', () => {
	it('contains exactly four templates', () => {
		expect(BUILT_IN_TEMPLATES).toHaveLength(4);
	});

	it('includes a Rust Systems template', () => {
		const t = BUILT_IN_TEMPLATES.find((t) => t.id === 'tmpl-rust');
		expect(t).toBeDefined();
		expect(t!.name).toBe('Rust Systems');
		expect(t!.devcontainerConfig.image).toBe('mcr.microsoft.com/devcontainers/rust:1');
	});

	it('includes a SvelteKit Web template', () => {
		const t = BUILT_IN_TEMPLATES.find((t) => t.id === 'tmpl-svelte');
		expect(t).toBeDefined();
		expect(t!.name).toBe('SvelteKit Web');
		expect(t!.devcontainerConfig.image).toBe('mcr.microsoft.com/devcontainers/javascript-node:20');
	});

	it('includes a Python ML template', () => {
		const t = BUILT_IN_TEMPLATES.find((t) => t.id === 'tmpl-python-ml');
		expect(t).toBeDefined();
		expect(t!.name).toBe('Python ML');
		expect(t!.devcontainerConfig.image).toBe('mcr.microsoft.com/devcontainers/python:3.12');
	});

	it('includes a Blank template', () => {
		const t = BUILT_IN_TEMPLATES.find((t) => t.id === 'tmpl-blank');
		expect(t).toBeDefined();
		expect(t!.name).toBe('Blank');
		expect(t!.devcontainerConfig.image).toBe('mcr.microsoft.com/devcontainers/base:ubuntu-24.04');
	});

	it('every template has required fields', () => {
		for (const t of BUILT_IN_TEMPLATES) {
			expect(t.id).toBeTruthy();
			expect(t.name).toBeTruthy();
			expect(t.description).toBeTruthy();
			expect(Array.isArray(t.tags)).toBe(true);
			expect(t.devcontainerConfig).toBeDefined();
			expect(t.devcontainerConfig.image).toBeTruthy();
		}
	});
});

describe('getTemplateById', () => {
	it('returns the template for a known id', () => {
		const t = getTemplateById('tmpl-rust');
		expect(t).toBeDefined();
		expect(t!.id).toBe('tmpl-rust');
	});

	it('returns undefined for an unknown id', () => {
		expect(getTemplateById('tmpl-does-not-exist')).toBeUndefined();
	});
});

describe('validateTemplate', () => {
	const valid: Template = {
		id: 'tmpl-test',
		name: 'Test',
		description: 'A test template',
		tags: ['test'],
		devcontainerConfig: {
			image: 'ubuntu:24.04'
		}
	};

	it('returns success for a valid template', () => {
		const result = validateTemplate(valid);
		expect(result.success).toBe(true);
	});

	it('returns failure when id is missing', () => {
		const result = validateTemplate({ ...valid, id: '' });
		expect(result.success).toBe(false);
	});

	it('returns failure when name is missing', () => {
		const result = validateTemplate({ ...valid, name: '' });
		expect(result.success).toBe(false);
	});

	it('returns failure when description is missing', () => {
		const result = validateTemplate({ ...valid, description: '' });
		expect(result.success).toBe(false);
	});

	it('returns failure when image is missing', () => {
		const result = validateTemplate({
			...valid,
			devcontainerConfig: { ...valid.devcontainerConfig, image: '' }
		});
		expect(result.success).toBe(false);
	});

	it('all built-in templates pass validation', () => {
		for (const t of BUILT_IN_TEMPLATES) {
			const result = validateTemplate(t);
			expect(result.success).toBe(true);
		}
	});
});
