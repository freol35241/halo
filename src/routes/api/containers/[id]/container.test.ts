// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { FakeDockerService } from '$lib/server/docker/fake-docker-service.js';
import { ContainerService } from '$lib/server/containers/container-service.js';
import { _handleGetContainer, _handlePatchContainer, _handleDeleteContainer } from './+server.js';

function makeRequest(method: string, body?: unknown): Request {
	return new Request('http://localhost/api/containers/test-id', {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
}

describe('GET /api/containers/[id]', () => {
	let service: ContainerService;
	let containerId: string;

	beforeEach(async () => {
		const db = new Database(':memory:');
		runMigrations(db);
		service = new ContainerService(db, new FakeDockerService());
		const c = await service.create({
			name: 'my-app',
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		containerId = c.id;
	});

	it('returns 200 with container data', async () => {
		const res = await _handleGetContainer(containerId, service);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.id).toBe(containerId);
		expect(body.name).toBe('my-app');
	});

	it('returns 404 for unknown id', async () => {
		const res = await _handleGetContainer('nonexistent', service);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});
});

describe('PATCH /api/containers/[id]', () => {
	let service: ContainerService;
	let containerId: string;

	beforeEach(async () => {
		const db = new Database(':memory:');
		runMigrations(db);
		service = new ContainerService(db, new FakeDockerService());
		const c = await service.create({
			name: 'patch-me',
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		containerId = c.id;
	});

	it('updates config and returns 200', async () => {
		const req = makeRequest('PATCH', {
			config: { env: { FOO: 'bar' }, repoUrl: 'https://github.com/x/y' }
		});
		const res = await _handlePatchContainer(containerId, req, service);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.config.env).toEqual({ FOO: 'bar' });
		expect(body.config.repoUrl).toBe('https://github.com/x/y');
	});

	it('returns 404 for unknown id', async () => {
		const req = makeRequest('PATCH', { config: {} });
		const res = await _handlePatchContainer('nonexistent', req, service);
		expect(res.status).toBe(404);
	});

	it('returns 400 when body is missing', async () => {
		const req = makeRequest('PATCH');
		const res = await _handlePatchContainer(containerId, req, service);
		expect(res.status).toBe(400);
	});
});

describe('DELETE /api/containers/[id]', () => {
	let service: ContainerService;
	let containerId: string;

	beforeEach(async () => {
		const db = new Database(':memory:');
		runMigrations(db);
		service = new ContainerService(db, new FakeDockerService());
		const c = await service.create({
			name: 'del-me',
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		containerId = c.id;
	});

	it('destroys container and returns 204', async () => {
		const res = await _handleDeleteContainer(containerId, service);
		expect(res.status).toBe(204);
	});

	it('container is gone after delete', async () => {
		await _handleDeleteContainer(containerId, service);
		const found = await service.get(containerId);
		expect(found).toBeNull();
	});

	it('returns 404 for unknown id', async () => {
		const res = await _handleDeleteContainer('nonexistent', service);
		expect(res.status).toBe(404);
	});
});
