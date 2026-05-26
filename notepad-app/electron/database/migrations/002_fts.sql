-- 002_fts.sql
-- FTS5 tam metin arama tablosu ve trigger'ları

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
