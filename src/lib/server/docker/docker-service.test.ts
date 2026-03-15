import { describe, it, expect, beforeEach } from 'vitest';
import type { DockerService, CreateContainerOptions } from './docker-service.js';
import { FakeDockerService } from './fake-docker-service.js';

describe('DockerService (via FakeDockerService)', () => {
	let service: DockerService;

	beforeEach(() => {
		service = new FakeDockerService();
	});

	describe('create', () => {
		it('creates a container and returns its info', async () => {
			const opts: CreateContainerOptions = {
				name: 'test-container',
				image: 'ubuntu:22.04',
				env: { FOO: 'bar' },
				mounts: ['/host/path:/container/path'],
				ports: [3000, 8080]
			};

			const info = await service.create(opts);

			expect(info.id).toBeTruthy();
			expect(info.name).toBe('test-container');
			expect(info.image).toBe('ubuntu:22.04');
			expect(info.status).toBe('stopped');
			expect(info.network).toBe('halo-net');
		});

		it('does not publish ports to the host', async () => {
			const info = await service.create({
				name: 'no-ports',
				image: 'ubuntu:22.04',
				ports: [3000]
			});

			expect(info.publishedPorts).toEqual({});
		});

		it('attaches container to halo-net network', async () => {
			const info = await service.create({
				name: 'networked',
				image: 'ubuntu:22.04'
			});

			expect(info.network).toBe('halo-net');
		});

		it('throws if a container with the same name already exists', async () => {
			await service.create({ name: 'dup', image: 'ubuntu:22.04' });
			await expect(service.create({ name: 'dup', image: 'ubuntu:22.04' })).rejects.toThrow(
				'already exists'
			);
		});
	});

	describe('start', () => {
		it('starts a stopped container', async () => {
			const info = await service.create({ name: 'to-start', image: 'ubuntu:22.04' });
			await service.start(info.id);
			const updated = await service.inspect(info.id);
			expect(updated.status).toBe('running');
		});

		it('throws if container does not exist', async () => {
			await expect(service.start('nonexistent')).rejects.toThrow('not found');
		});
	});

	describe('stop', () => {
		it('stops a running container', async () => {
			const info = await service.create({ name: 'to-stop', image: 'ubuntu:22.04' });
			await service.start(info.id);
			await service.stop(info.id);
			const updated = await service.inspect(info.id);
			expect(updated.status).toBe('stopped');
		});

		it('throws if container does not exist', async () => {
			await expect(service.stop('nonexistent')).rejects.toThrow('not found');
		});
	});

	describe('remove', () => {
		it('removes a stopped container', async () => {
			const info = await service.create({ name: 'to-remove', image: 'ubuntu:22.04' });
			await service.remove(info.id);
			await expect(service.inspect(info.id)).rejects.toThrow('not found');
		});

		it('removes a running container when force=true', async () => {
			const info = await service.create({ name: 'force-remove', image: 'ubuntu:22.04' });
			await service.start(info.id);
			await service.remove(info.id, { force: true });
			await expect(service.inspect(info.id)).rejects.toThrow('not found');
		});

		it('throws if trying to remove running container without force', async () => {
			const info = await service.create({ name: 'running-remove', image: 'ubuntu:22.04' });
			await service.start(info.id);
			await expect(service.remove(info.id)).rejects.toThrow('running');
		});

		it('throws if container does not exist', async () => {
			await expect(service.remove('nonexistent')).rejects.toThrow('not found');
		});
	});

	describe('list', () => {
		it('returns empty list when no containers exist', async () => {
			const containers = await service.list();
			expect(containers).toEqual([]);
		});

		it('returns all created containers', async () => {
			await service.create({ name: 'c1', image: 'ubuntu:22.04' });
			await service.create({ name: 'c2', image: 'ubuntu:22.04' });
			const containers = await service.list();
			expect(containers).toHaveLength(2);
		});

		it('does not return removed containers', async () => {
			const info = await service.create({ name: 'c-removed', image: 'ubuntu:22.04' });
			await service.remove(info.id);
			const containers = await service.list();
			expect(containers).toHaveLength(0);
		});
	});

	describe('inspect', () => {
		it('returns container info by id', async () => {
			const info = await service.create({ name: 'inspectable', image: 'alpine:latest' });
			const result = await service.inspect(info.id);
			expect(result.id).toBe(info.id);
			expect(result.name).toBe('inspectable');
			expect(result.image).toBe('alpine:latest');
		});

		it('throws if container does not exist', async () => {
			await expect(service.inspect('nonexistent')).rejects.toThrow('not found');
		});
	});
});
