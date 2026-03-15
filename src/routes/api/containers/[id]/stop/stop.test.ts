// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { FakeDockerService } from '$lib/server/docker/fake-docker-service.js';
import { ContainerService } from '$lib/server/containers/container-service.js';
import { _handleStopContainer } from './+server.js';

describe('POST /api/containers/[id]/stop', () => {
	let service: ContainerService;
	let containerId: string;

	beforeEach(async () => {
		const db = new Database(':memory:');
		runMigrations(db);
		service = new ContainerService(db, new FakeDockerService());
		const c = await service.create({
			name: 'stop-me',
			templateId: 'blank',
			config: { image: 'alpine' }
		});
		containerId = c.id;
		// Start it first so we can stop it
		await service.start(containerId);
	});

	it('stops the container and returns 200 with updated container', async () => {
		const res = await _handleStopContainer(containerId, service);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe('stopped');
		expect(body.id).toBe(containerId);
	});

	it('returns 404 for unknown id', async () => {
		const res = await _handleStopContainer('nonexistent', service);
		expect(res.status).toBe(404);
	});
});
