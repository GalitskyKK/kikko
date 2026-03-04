pub const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS clipboard_entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  encrypted INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  app_source TEXT,
  char_count INTEGER NOT NULL DEFAULT 0,
  preview TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"#;

pub const SCHEMA_SQL_V2: &str = r#"
CREATE TABLE IF NOT EXISTS clipboard_assets (
  entry_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clipboard_entries_created_at
ON clipboard_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clipboard_entries_favorite
ON clipboard_entries(is_favorite);

CREATE INDEX IF NOT EXISTS idx_clipboard_entries_pinned
ON clipboard_entries(is_pinned);
"#;
