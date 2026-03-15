import { describe, it, expect } from 'vitest';
import { _handleGetTemplates } from './+server.js';

describe('GET /api/templates', () => {
	it('returns 200 with an array of templates', async () => {
		const response = await _handleGetTemplates();
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(Array.isArray(body)).toBe(true);
		expect(body.length).toBeGreaterThan(0);
	});

	it('returns all four built-in templates', async () => {
		const response = await _handleGetTemplates();
		const body = await response.json();
		expect(body).toHaveLength(4);
	});

	it('each template has id, name, description, tags, devcontainerConfig', async () => {
		const response = await _handleGetTemplates();
		const body = await response.json();

		for (const t of body) {
			expect(typeof t.id).toBe('string');
			expect(typeof t.name).toBe('string');
			expect(typeof t.description).toBe('string');
			expect(Array.isArray(t.tags)).toBe(true);
			expect(t.devcontainerConfig).toBeDefined();
			expect(typeof t.devcontainerConfig.image).toBe('string');
		}
	});

	it('includes the Rust Systems template', async () => {
		const response = await _handleGetTemplates();
		const body = await response.json();
		const rust = body.find((t: { id: string }) => t.id === 'tmpl-rust');
		expect(rust).toBeDefined();
		expect(rust.name).toBe('Rust Systems');
	});
});
