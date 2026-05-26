-- 001_initial.sql
-- Temel veritabanı şeması

CREATE TABLE IF NOT EXISTS notebooks (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT DEFAULT '📓',
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  notebook_id  TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Başlıksız Not',
  content      TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  is_pinned    INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id          TEXT PRIMARY KEY,
  note_id     TEXT REFERENCES notes(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  fire_at     INTEGER NOT NULL,
  repeat      TEXT DEFAULT 'none',
  is_done     INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
