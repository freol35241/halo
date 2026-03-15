CREATE TABLE containers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'stopped',
  config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE feed_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_container ON sessions(container_id);
CREATE INDEX idx_feed_entries_session ON feed_entries(session_id);
