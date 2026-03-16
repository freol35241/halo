import { getDb } from '../db/index.js';
import { SessionService } from './session-service.js';

let instance: SessionService | null = null;

export function getSessionService(): SessionService {
	if (!instance) {
		instance = new SessionService(getDb());
	}
	return instance;
}
