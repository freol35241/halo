import { getDb } from '../db/index.js';
import { DockerodeService } from '../docker/dockerode-service.js';
import { ContainerService } from './container-service.js';

let instance: ContainerService | null = null;

export function getContainerService(): ContainerService {
	if (!instance) {
		instance = new ContainerService(getDb(), new DockerodeService());
	}
	return instance;
}
