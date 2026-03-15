export type FeedRole = 'human' | 'assistant' | 'tool' | 'command' | 'output' | 'system';

export interface FeedMetadata {
	thinking?: string;
	tool?: string;
	path?: string;
	phase?: string;
	status?: 'success' | 'error' | 'pending';
}

export interface FeedEntry {
	id: string;
	sessionId: string;
	ts: string;
	role: FeedRole;
	content: string;
	metadata?: FeedMetadata;
}
