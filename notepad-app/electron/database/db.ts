import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function initDb(): Database.Database {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'notepad.db');

  db = new Database(dbPath);

  // WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  runMigrations(db);

  return db;
}

function runMigrations(database: Database.Database): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `);

  // Try multiple possible migration directories
  const possibleDirs = [
    path.join(__dirname, 'database', 'migrations'),
    path.join(__dirname, '..', 'electron', 'database', 'migrations'),
    path.join(process.cwd(), 'electron', 'database', 'migrations'),
    path.join(__dirname, 'migrations'),
  ];

  let migDir: string | null = null;
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      migDir = dir;
      break;
    }
  }

  if (!migDir) {
    console.log('Using inline migrations');
    runInlineMigrations(database);
    return;
  }

  const files = fs.readdirSync(migDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = database.prepare('SELECT filename FROM _migrations').all() as { filename: string }[];
  const appliedSet = new Set(applied.map(r => r.filename));

  for (const file of files) {
    if (!appliedSet.has(file)) {
      const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
      database.exec(sql);
      database.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)').run(file, Date.now());
      console.log(`Applied migration: ${file}`);
    }
  }
}

function runInlineMigrations(database: Database.Database): void {
  const applied = database.prepare('SELECT filename FROM _migrations').all() as { filename: string }[];
  const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename));

  if (!appliedSet.has('001_initial.sql')) {
    database.exec(`
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
    `);
    database.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)').run('001_initial.sql', Date.now());
  }

  if (!appliedSet.has('002_fts.sql')) {
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content_text,
        content='notes',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content_text)
        VALUES (new.rowid, new.title, new.content_text);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content_text)
        VALUES ('delete', old.rowid, old.title, old.content_text);
        INSERT INTO notes_fts(rowid, title, content_text)
        VALUES (new.rowid, new.title, new.content_text);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content_text)
        VALUES ('delete', old.rowid, old.title, old.content_text);
      END;
    `);
    database.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)').run('002_fts.sql', Date.now());
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
