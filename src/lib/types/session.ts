export type SessionType = 'claude' | 'terminal' | 'shell';

export type SessionStatus = 'idle' | 'running' | 'stopped' | 'error';

export interface Session {
	id: string;
	name: string;
	type: SessionType;
	containerId: string;
	status: SessionStatus;
	createdAt: string;
	updatedAt: string;
}
