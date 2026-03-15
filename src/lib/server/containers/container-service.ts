import type Database from 'better-sqlite3';
import type { DockerService } from '../docker/docker-service.js';
import {
	createContainer as dbCreate,
	getContainerById,
	getAllContainers,
	updateContainer as dbUpdate,
	deleteContainer as dbDelete
} from '../db/containers.js';
import type { Container, ContainerConfig, ContainerStatus } from '../../types/container.js';

export interface CreateContainerInput {
	name: string;
	templateId: string;
	config: ContainerConfig;
}

function toContainer(row: {
	id: string;
	name: string;
	template_id: string;
	status: string;
	config: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}): Container {
	return {
		id: row.id,
		name: row.name,
		templateId: row.template_id,
		status: row.status as ContainerStatus,
		config: row.config as ContainerConfig,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

export class ContainerService {
	constructor(
		private db: Database.Database,
		private docker: DockerService
	) {}

	async create(input: CreateContainerInput): Promise<Container> {
		// Create Docker container first — Docker assigns the canonical ID
		const dockerInfo = await this.docker.create({
			name: input.name,
			image: input.config.image ?? 'ubuntu:22.04',
			env: input.config.env,
			mounts: input.config.mounts,
			ports: input.config.ports
		});

		// Persist to DB using Docker-assigned ID
		const row = dbCreate(this.db, {
			id: dockerInfo.id,
			name: input.name,
			template_id: input.templateId,
			config: input.config as Record<string, unknown>,
			status: 'stopped'
		});
		return toContainer(row);
	}

	async list(): Promise<Container[]> {
		return getAllContainers(this.db).map(toContainer);
	}

	async get(id: string): Promise<Container | null> {
		const row = getContainerById(this.db, id);
		return row ? toContainer(row) : null;
	}

	async updateConfig(id: string, config: Partial<ContainerConfig>): Promise<Container | null> {
		const existing = getContainerById(this.db, id);
		if (!existing) return null;

		const merged = { ...(existing.config as ContainerConfig), ...config };
		const row = dbUpdate(this.db, id, { config: merged as Record<string, unknown> });
		return row ? toContainer(row) : null;
	}

	async start(id: string): Promise<Container> {
		const existing = getContainerById(this.db, id);
		if (!existing) {
			throw new Error(`Container '${id}' not found`);
		}

		await this.docker.start(id);
		const row = dbUpdate(this.db, id, { status: 'running' })!;
		return toContainer(row);
	}

	async stop(id: string): Promise<Container> {
		const existing = getContainerById(this.db, id);
		if (!existing) {
			throw new Error(`Container '${id}' not found`);
		}

		await this.docker.stop(id);
		const row = dbUpdate(this.db, id, { status: 'stopped' })!;
		return toContainer(row);
	}

	async destroy(id: string): Promise<void> {
		const existing = getContainerById(this.db, id);
		if (!existing) {
			throw new Error(`Container '${id}' not found`);
		}

		await this.docker.remove(id, { force: true });
		dbDelete(this.db, id);
	}
}
