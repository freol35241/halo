// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { FakeDockerService } from '$lib/server/docker/fake-docker-service.js';
import { ContainerService } from '$lib/server/containers/container-service.js';
import { _handleGetContainers, _handlePostContainer } from './+server.js';

function makeRequest(method: string, body?: unknown): Request {
	return new Request('http://localhost/api/containers', {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
}

describe('GET /api/containers', () => {
	let service: ContainerService;

	beforeEach(() => {
		const db = new Database(':memory:');
		runMigrations(db);
		service = new ContainerService(db, new FakeDockerService());
	});

	it('returns 200 with empty array when no containers', async () => {
		const res = await _handleGetContainers(service);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual([]);
	});

	it('returns all containers', async () => {
		await service.create({ name: 'c1', templateId: 'blank', config: { image: 'alpine' } });
		await service.create({ name: 'c2', templateId: 'blank', config: { image: 'alpine' } });

		const res = await _handleGetContainers(service);
		const body = await res.json();
		expect(body).toHaveLength(2);
		expect(body[0].name).toBe('c1');
		expect(body[1].name).toBe('c2');
	});
});

describe('POST /api/containers', () => {
	let service: ContainerService;

	beforeEach(() => {
		const db = new Database(':memory:');
		runMigrations(db);
		service = new ContainerService(db, new FakeDockerService());
	});

	it('creates a container and returns 201', async () => {
		const req = makeRequest('POST', {
			name: 'new-app',
			templateId: 'blank',
			config: { image: 'alpine:latest' }
		});

		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.id).toBeTruthy();
		expect(body.name).toBe('new-app');
		expect(body.templateId).toBe('blank');
		expect(body.status).toBe('stopped');
	});

	it('returns 400 when name is missing', async () => {
		const req = makeRequest('POST', { templateId: 'blank', config: { image: 'alpine' } });
		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	it('returns 400 when templateId is missing', async () => {
		const req = makeRequest('POST', { name: 'my-app', config: { image: 'alpine' } });
		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 for invalid container name', async () => {
		const req = makeRequest('POST', {
			name: 'ab', // too short
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 for name with invalid characters', async () => {
		const req = makeRequest('POST', {
			name: 'my app!', // spaces and ! not allowed
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 when body is missing', async () => {
		const req = makeRequest('POST');
		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 409 when container name already taken', async () => {
		await service.create({ name: 'taken', templateId: 'blank', config: { image: 'alpine' } });

		const req = makeRequest('POST', {
			name: 'taken',
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		const res = await _handlePostContainer(req, service);
		expect(res.status).toBe(409);
	});
});
