// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';
import {
	createContainer,
	getContainerById,
	getAllContainers,
	updateContainer,
	deleteContainer
} from './containers.js';

describe('containers repository', () => {
	let db: Database.Database;

	beforeEach(() => {
		db = new Database(':memory:');
		runMigrations(db);
	});

	it('creates a container and returns it', () => {
		const container = createContainer(db, {
			id: 'c1',
			name: 'my-container',
			template_id: 'rust',
			config: { image: 'rust:latest' }
		});
		expect(container.id).toBe('c1');
		expect(container.name).toBe('my-container');
		expect(container.status).toBe('stopped');
	});

	it('gets a container by id', () => {
		createContainer(db, { id: 'c2', name: 'foo', template_id: 'blank', config: {} });
		const found = getContainerById(db, 'c2');
		expect(found).not.toBeNull();
		expect(found!.name).toBe('foo');
	});

	it('returns null for unknown id', () => {
		expect(getContainerById(db, 'nope')).toBeNull();
	});

	it('gets all containers', () => {
		createContainer(db, { id: 'c3', name: 'a', template_id: 'blank', config: {} });
		createContainer(db, { id: 'c4', name: 'b', template_id: 'blank', config: {} });
		const all = getAllContainers(db);
		expect(all.length).toBe(2);
	});

	it('updates a container', () => {
		createContainer(db, { id: 'c5', name: 'upd', template_id: 'blank', config: {} });
		updateContainer(db, 'c5', { status: 'running' });
		const updated = getContainerById(db, 'c5');
		expect(updated!.status).toBe('running');
	});

	it('deletes a container', () => {
		createContainer(db, { id: 'c6', name: 'del', template_id: 'blank', config: {} });
		deleteContainer(db, 'c6');
		expect(getContainerById(db, 'c6')).toBeNull();
	});

	it('stores and retrieves config as JSON', () => {
		const config = { image: 'rust:1.75', env: { FOO: 'bar' } };
		createContainer(db, { id: 'c7', name: 'json', template_id: 'rust', config });
		const found = getContainerById(db, 'c7');
		expect(found!.config).toEqual(config);
	});
});
