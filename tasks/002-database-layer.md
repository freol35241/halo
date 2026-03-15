# Task 002 — Database Layer

**Status:** `[ ]`
**Phase:** Foundation

## Objective

Set up better-sqlite3 with a migration system. Create initial schema for containers, sessions, and feed_entries tables. Write a migration runner that applies SQL files in order. Full TDD.

## Requirements

1. Install `better-sqlite3` and `@types/better-sqlite3`.

2. Create migration runner at `src/lib/server/db/migrate.ts`:
   - Reads `.sql` files from `src/lib/server/db/migrations/` in alphabetical order
   - Tracks applied migrations in a `_migrations` table
   - Applies only unapplied migrations
   - Each migration runs in a transaction

3. Create initial migration `src/lib/server/db/migrations/001-initial-schema.sql`:
   ```sql
   CREATE TABLE containers (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL UNIQUE,
     template_id TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'stopped',
     config TEXT NOT NULL DEFAULT '{}',  -- JSON
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   CREATE TABLE sessions (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     type TEXT NOT NULL,  -- 'claude' | 'terminal' | 'shell'
     container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
     status TEXT NOT NULL DEFAULT 'idle',
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   CREATE TABLE feed_entries (
     id TEXT PRIMARY KEY,
     session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
     role TEXT NOT NULL,  -- 'human' | 'assistant' | 'tool' | 'command' | 'output' | 'system'
     content TEXT NOT NULL,
     metadata TEXT DEFAULT '{}',  -- JSON
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   CREATE INDEX idx_sessions_container ON sessions(container_id);
   CREATE INDEX idx_feed_entries_session ON feed_entries(session_id);
   ```

4. Create database service at `src/lib/server/db/index.ts`:
   - `getDb()` — returns singleton database connection
   - `closeDb()` — closes the connection
   - Database path from `HALO_DB_PATH` env var, default `./data/halo.db`
   - WAL mode enabled for better concurrent read performance

5. Create repository modules:
   - `src/lib/server/db/containers.ts` — CRUD for containers table
   - `src/lib/server/db/sessions.ts` — CRUD for sessions table
   - `src/lib/server/db/feed-entries.ts` — CRUD for feed_entries table

## Acceptance Criteria

- [ ] `better-sqlite3` installed and wrapped in typed service
- [ ] Migration runner applies SQL files in order, tracks state, is idempotent
- [ ] Initial migration creates all three tables with correct schema
- [ ] Container CRUD: create, getById, getAll, update, delete
- [ ] Session CRUD: create, getById, getAll (with container filter), update, delete
- [ ] FeedEntry CRUD: create, getBySessionId (ordered by created_at), delete by session
- [ ] All operations tested with in-memory SQLite (`:memory:`)
- [ ] Database path configurable via env var

## Review Feedback

_(populated by the review agent)_
