import Dockerode from 'dockerode';
import type {
	DockerService,
	DockerContainerInfo,
	CreateContainerOptions,
	RemoveContainerOptions
} from './docker-service.js';

const HALO_NETWORK = 'halo-net';

function toEnvArray(env: Record<string, string>): string[] {
	return Object.entries(env).map(([k, v]) => `${k}=${v}`);
}

function parseBinds(mounts: string[]): string[] {
	return mounts;
}

/**
 * Real DockerService implementation using Dockerode.
 * Requires access to the Docker socket at /var/run/docker.sock.
 */
export class DockerodeService implements DockerService {
	private docker: Dockerode;

	constructor(docker?: Dockerode) {
		this.docker = docker ?? new Dockerode({ socketPath: '/var/run/docker.sock' });
	}

	async create(options: CreateContainerOptions): Promise<DockerContainerInfo> {
		const container = await this.docker.createContainer({
			name: options.name,
			Image: options.image,
			Env: options.env ? toEnvArray(options.env) : undefined,
			HostConfig: {
				Binds: options.mounts ? parseBinds(options.mounts) : undefined,
				// Never publish ports to the host — access via halo-net only
				NetworkMode: HALO_NETWORK
			},
			// No PortBindings — ports are accessible only within halo-net
			ExposedPorts: options.ports
				? Object.fromEntries(options.ports.map((p) => [`${p}/tcp`, {}]))
				: undefined
		});

		return this.inspect(container.id);
	}

	async start(id: string): Promise<void> {
		const container = this.docker.getContainer(id);
		await container.start();
	}

	async stop(id: string): Promise<void> {
		const container = this.docker.getContainer(id);
		await container.stop();
	}

	async remove(id: string, options: RemoveContainerOptions = {}): Promise<void> {
		const container = this.docker.getContainer(id);
		await container.remove({ force: options.force ?? false });
	}

	async list(): Promise<DockerContainerInfo[]> {
		const containers = await this.docker.listContainers({ all: true });
		return containers.map((c) => ({
			id: c.Id,
			name: (c.Names[0] ?? '').replace(/^\//, ''),
			image: c.Image,
			status: c.State === 'running' ? 'running' : 'stopped',
			network: HALO_NETWORK,
			publishedPorts: {}
		}));
	}

	async inspect(id: string): Promise<DockerContainerInfo> {
		const container = this.docker.getContainer(id);
		const info = await container.inspect();
		return {
			id: info.Id,
			name: info.Name.replace(/^\//, ''),
			image: info.Config.Image,
			status: info.State.Running ? 'running' : 'stopped',
			network: HALO_NETWORK,
			publishedPorts: {}
		};
	}
}
