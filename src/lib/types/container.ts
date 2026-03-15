export type ContainerStatus = 'creating' | 'running' | 'stopped' | 'destroyed';

export interface ContainerConfig {
	image?: string;
	env?: Record<string, string>;
	ports?: number[];
	mounts?: string[];
	extensions?: string[];
	postCreateCommand?: string;
	repoUrl?: string;
	claudeMdSource?: string;
}

export interface Container {
	id: string;
	name: string;
	templateId: string;
	status: ContainerStatus;
	config: ContainerConfig;
	createdAt: string;
	updatedAt: string;
}
