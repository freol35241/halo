// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrate.js';
import { FakeDockerService } from '../docker/fake-docker-service.js';
import { ContainerService } from './container-service.js';

describe('ContainerService', () => {
	let db: Database.Database;
	let docker: FakeDockerService;
	let service: ContainerService;

	beforeEach(() => {
		db = new Database(':memory:');
		runMigrations(db);
		docker = new FakeDockerService();
		service = new ContainerService(db, docker);
	});

	describe('create', () => {
		it('creates a container and persists it to the database', async () => {
			const container = await service.create({
				name: 'my-app',
				templateId: 'blank',
				config: { image: 'ubuntu:22.04' }
			});

			expect(container.id).toBeTruthy();
			expect(container.name).toBe('my-app');
			expect(container.templateId).toBe('blank');
			expect(container.config.image).toBe('ubuntu:22.04');
			expect(container.status).toBe('stopped');
		});

		it('also creates the Docker container', async () => {
			const container = await service.create({
				name: 'docker-check',
				templateId: 'blank',
				config: { image: 'alpine:latest' }
			});

			const dockerInfo = await docker.inspect(container.id);
			expect(dockerInfo.name).toBe('docker-check');
			expect(dockerInfo.image).toBe('alpine:latest');
		});

		it('throws if container name is already taken', async () => {
			await service.create({ name: 'dup', templateId: 'blank', config: { image: 'alpine' } });
			await expect(
				service.create({ name: 'dup', templateId: 'blank', config: { image: 'alpine' } })
			).rejects.toThrow();
		});

		it('passes env, mounts, and ports to Docker', async () => {
			await service.create({
				name: 'with-config',
				templateId: 'rust',
				config: {
					image: 'rust:latest',
					env: { RUST_LOG: 'debug' },
					mounts: ['/host:/container'],
					ports: [8080]
				}
			});

			const dockerInfo = await docker.inspect(
				(await docker.list()).find((c) => c.name === 'with-config')!.id
			);
			expect(dockerInfo).toBeTruthy();
		});
	});

	describe('list', () => {
		it('returns empty array when no containers exist', async () => {
			const list = await service.list();
			expect(list).toEqual([]);
		});

		it('returns all containers', async () => {
			await service.create({ name: 'c1', templateId: 'blank', config: { image: 'alpine' } });
			await service.create({ name: 'c2', templateId: 'blank', config: { image: 'alpine' } });
			const list = await service.list();
			expect(list).toHaveLength(2);
		});
	});

	describe('get', () => {
		it('returns a container by id', async () => {
			const created = await service.create({
				name: 'get-me',
				templateId: 'blank',
				config: { image: 'alpine' }
			});
			const found = await service.get(created.id);
			expect(found).not.toBeNull();
			expect(found!.id).toBe(created.id);
			expect(found!.name).toBe('get-me');
		});

		it('returns null for unknown id', async () => {
			const result = await service.get('nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('updateConfig', () => {
		it('updates the container config', async () => {
			const container = await service.create({
				name: 'update-me',
				templateId: 'blank',
				config: { image: 'alpine' }
			});

			const updated = await service.updateConfig(container.id, {
				env: { MY_VAR: 'hello' },
				repoUrl: 'https://github.com/example/repo'
			});

			expect(updated).not.toBeNull();
			expect(updated!.config.env).toEqual({ MY_VAR: 'hello' });
			expect(updated!.config.repoUrl).toBe('https://github.com/example/repo');
		});

		it('returns null for unknown id', async () => {
			const result = await service.updateConfig('nonexistent', {});
			expect(result).toBeNull();
		});
	});

	describe('start', () => {
		it('starts a stopped container and updates status', async () => {
			const container = await service.create({
				name: 'start-me',
				templateId: 'blank',
				config: { image: 'alpine' }
			});

			const started = await service.start(container.id);
			expect(started.status).toBe('running');

			const dockerInfo = await docker.inspect(container.id);
			expect(dockerInfo.status).toBe('running');
		});

		it('throws for unknown container id', async () => {
			await expect(service.start('nonexistent')).rejects.toThrow();
		});
	});

	describe('stop', () => {
		it('stops a running container and updates status', async () => {
			const container = await service.create({
				name: 'stop-me',
				templateId: 'blank',
				config: { image: 'alpine' }
			});
			await service.start(container.id);

			const stopped = await service.stop(container.id);
			expect(stopped.status).toBe('stopped');

			const dockerInfo = await docker.inspect(container.id);
			expect(dockerInfo.status).toBe('stopped');
		});

		it('throws for unknown container id', async () => {
			await expect(service.stop('nonexistent')).rejects.toThrow();
		});
	});

	describe('destroy', () => {
		it('removes the container from Docker and database', async () => {
			const container = await service.create({
				name: 'destroy-me',
				templateId: 'blank',
				config: { image: 'alpine' }
			});

			await service.destroy(container.id);

			const found = await service.get(container.id);
			expect(found).toBeNull();

			await expect(docker.inspect(container.id)).rejects.toThrow('not found');
		});

		it('force-removes a running container', async () => {
			const container = await service.create({
				name: 'running-destroy',
				templateId: 'blank',
				config: { image: 'alpine' }
			});
			await service.start(container.id);

			await service.destroy(container.id);

			const found = await service.get(container.id);
			expect(found).toBeNull();
		});

		it('throws for unknown container id', async () => {
			await expect(service.destroy('nonexistent')).rejects.toThrow();
		});
	});
});
