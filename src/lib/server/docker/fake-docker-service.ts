import { randomUUID } from 'crypto';
import type {
	DockerService,
	DockerContainerInfo,
	CreateContainerOptions,
	RemoveContainerOptions
} from './docker-service.js';

/**
 * In-memory fake implementation of DockerService for use in tests.
 * Does not require a real Docker daemon.
 */
export class FakeDockerService implements DockerService {
	private containers: Map<string, DockerContainerInfo> = new Map();

	async create(options: CreateContainerOptions): Promise<DockerContainerInfo> {
		const existing = Array.from(this.containers.values()).find((c) => c.name === options.name);
		if (existing) {
			throw new Error(`Container '${options.name}' already exists`);
		}

		const info: DockerContainerInfo = {
			id: randomUUID(),
			name: options.name,
			image: options.image,
			status: 'stopped',
			network: 'halo-net',
			publishedPorts: {}
		};

		this.containers.set(info.id, info);
		return { ...info };
	}

	async start(id: string): Promise<void> {
		const container = this.containers.get(id);
		if (!container) {
			throw new Error(`Container '${id}' not found`);
		}
		container.status = 'running';
	}

	async stop(id: string): Promise<void> {
		const container = this.containers.get(id);
		if (!container) {
			throw new Error(`Container '${id}' not found`);
		}
		container.status = 'stopped';
	}

	async remove(id: string, options: RemoveContainerOptions = {}): Promise<void> {
		const container = this.containers.get(id);
		if (!container) {
			throw new Error(`Container '${id}' not found`);
		}
		if (container.status === 'running' && !options.force) {
			throw new Error(`Container '${id}' is running — stop it first or use force`);
		}
		this.containers.delete(id);
	}

	async list(): Promise<DockerContainerInfo[]> {
		return Array.from(this.containers.values()).map((c) => ({ ...c }));
	}

	async inspect(id: string): Promise<DockerContainerInfo> {
		const container = this.containers.get(id);
		if (!container) {
			throw new Error(`Container '${id}' not found`);
		}
		return { ...container };
	}
}
