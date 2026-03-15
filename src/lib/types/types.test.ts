/**
 * Compile-time and runtime type shape tests for domain entities.
 * These tests verify that types are exported correctly and have the expected shape.
 */
import { describe, it, expect } from 'vitest';
import type { Container, ContainerStatus, ContainerConfig } from './container.js';
import type { Session, SessionType, SessionStatus } from './session.js';
import type { FeedEntry, FeedRole, FeedMetadata } from './feed.js';
import type { Template, DevcontainerConfig } from './template.js';

// Re-import from index to verify re-exports work
import type {
	Container as ContainerFromIndex,
	Session as SessionFromIndex,
	FeedEntry as FeedEntryFromIndex,
	Template as TemplateFromIndex
} from './index.js';

describe('Container types', () => {
	it('ContainerStatus includes all lifecycle states', () => {
		const statuses: ContainerStatus[] = ['creating', 'running', 'stopped', 'destroyed'];
		expect(statuses).toHaveLength(4);
	});

	it('Container has required fields', () => {
		const container: Container = {
			id: 'c-1',
			name: 'my-container',
			templateId: 'rust',
			status: 'stopped',
			config: {},
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z'
		};
		expect(container.id).toBe('c-1');
		expect(container.status).toBe('stopped');
	});

	it('ContainerConfig allows optional fields', () => {
		const config: ContainerConfig = {};
		expect(config).toBeDefined();

		const full: ContainerConfig = {
			image: 'node:20',
			env: { NODE_ENV: 'development' },
			ports: [3000],
			mounts: ['/workspace'],
			extensions: ['ms-vscode.vscode-typescript-next'],
			postCreateCommand: 'npm install',
			repoUrl: 'https://github.com/example/repo',
			claudeMdSource: 'repo'
		};
		expect(full.image).toBe('node:20');
	});
});

describe('Session types', () => {
	it('SessionType includes all valid types', () => {
		const types: SessionType[] = ['claude', 'terminal', 'shell'];
		expect(types).toHaveLength(3);
	});

	it('SessionStatus includes all valid statuses', () => {
		const statuses: SessionStatus[] = ['idle', 'running', 'stopped', 'error'];
		expect(statuses).toHaveLength(4);
	});

	it('Session has required fields', () => {
		const session: Session = {
			id: 's-1',
			name: 'my-session',
			type: 'claude',
			containerId: 'c-1',
			status: 'idle',
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z'
		};
		expect(session.type).toBe('claude');
	});
});

describe('FeedEntry types', () => {
	it('FeedRole includes all roles from design-vision.md', () => {
		const roles: FeedRole[] = ['human', 'assistant', 'tool', 'command', 'output', 'system'];
		expect(roles).toHaveLength(6);
	});

	it('FeedEntry has required fields and optional metadata', () => {
		const entry: FeedEntry = {
			id: 'f-1',
			sessionId: 's-1',
			ts: '2026-01-01T00:00:00Z',
			role: 'human',
			content: 'Hello'
		};
		expect(entry.metadata).toBeUndefined();
	});

	it('FeedMetadata supports all defined fields', () => {
		const meta: FeedMetadata = {
			thinking: 'some thought',
			tool: 'create_file',
			path: '/workspace/index.ts',
			phase: 'scope',
			status: 'success'
		};
		expect(meta.status).toBe('success');
	});
});

describe('Template types', () => {
	it('Template has required fields', () => {
		const template: Template = {
			id: 'rust',
			name: 'Rust Systems',
			description: 'Rust development environment',
			tags: ['rust', 'systems'],
			devcontainerConfig: {
				image: 'mcr.microsoft.com/devcontainers/rust:1'
			}
		};
		expect(template.id).toBe('rust');
	});

	it('DevcontainerConfig allows optional fields', () => {
		const config: DevcontainerConfig = {
			image: 'node:20',
			features: { 'ghcr.io/devcontainers/features/node:1': {} },
			postCreateCommand: 'npm install',
			customizations: {
				vscode: {
					extensions: ['ms-vscode.vscode-typescript-next'],
					settings: {}
				}
			},
			containerEnv: { NODE_ENV: 'development' },
			mounts: ['/workspace'],
			forwardPorts: [3000]
		};
		expect(config.image).toBe('node:20');
	});
});

describe('Index re-exports', () => {
	it('all major types are re-exported from index', () => {
		// These are compile-time checks - if the imports above resolved, they work.
		// We just verify the types are assignable.
		const c: ContainerFromIndex = {
			id: 'c-1',
			name: 'n',
			templateId: 't',
			status: 'stopped',
			config: {},
			createdAt: '',
			updatedAt: ''
		};
		const s: SessionFromIndex = {
			id: 's-1',
			name: 'n',
			type: 'claude',
			containerId: 'c-1',
			status: 'idle',
			createdAt: '',
			updatedAt: ''
		};
		const f: FeedEntryFromIndex = {
			id: 'f-1',
			sessionId: 's-1',
			ts: '',
			role: 'human',
			content: ''
		};
		const t: TemplateFromIndex = {
			id: 'rust',
			name: 'n',
			description: 'd',
			tags: [],
			devcontainerConfig: { image: 'img' }
		};
		expect(c.id).toBe('c-1');
		expect(s.id).toBe('s-1');
		expect(f.id).toBe('f-1');
		expect(t.id).toBe('rust');
	});
});
