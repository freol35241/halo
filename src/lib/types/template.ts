export interface DevcontainerConfig {
	image: string;
	features?: Record<string, unknown>;
	postCreateCommand?: string;
	customizations?: {
		vscode?: {
			extensions?: string[];
			settings?: Record<string, unknown>;
		};
	};
	containerEnv?: Record<string, string>;
	mounts?: string[];
	forwardPorts?: number[];
}

export interface Template {
	id: string;
	name: string;
	description: string;
	tags: string[];
	devcontainerConfig: DevcontainerConfig;
}
