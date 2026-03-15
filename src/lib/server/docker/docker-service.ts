export interface CreateContainerOptions {
	name: string;
	image: string;
	env?: Record<string, string>;
	mounts?: string[];
	ports?: number[];
}

export interface RemoveContainerOptions {
	force?: boolean;
}

export interface DockerContainerInfo {
	id: string;
	name: string;
	image: string;
	status: 'running' | 'stopped';
	network: string;
	/** Ports published to the host. HALO containers never publish ports — always empty. */
	publishedPorts: Record<string, unknown>;
}

export interface DockerService {
	create(options: CreateContainerOptions): Promise<DockerContainerInfo>;
	start(id: string): Promise<void>;
	stop(id: string): Promise<void>;
	remove(id: string, options?: RemoveContainerOptions): Promise<void>;
	list(): Promise<DockerContainerInfo[]>;
	inspect(id: string): Promise<DockerContainerInfo>;
}
