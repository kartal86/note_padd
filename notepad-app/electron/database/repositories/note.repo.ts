import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface NoteRow {
  id: string;
  notebook_id: string;
  title: string;
  content: string;
  content_text: string;
  is_pinned: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface SearchResult {
  id: string;
  notebook_id: string;
  title: string;
  content_text: string;
  snippet: string;
  notebook_name: string;
  updated_at: number;
}

export const noteRepo = {
  getByNotebook(notebookId: string): NoteRow[] {
    return getDb().prepare(`
      SELECT * FROM notes
      WHERE notebook_id = ?
      ORDER BY is_pinned DESC, updated_at DESC
    `).all(notebookId) as NoteRow[];
  },

  getById(id: string): NoteRow | undefined {
    return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined;
  },

  create(data: { notebook_id: string; title?: string; content?: string; content_text?: string }): NoteRow {
    const id = uuidv4();
    const now = Date.now();

    getDb().prepare(`
      INSERT INTO notes (id, notebook_id, title, content, content_text, is_pinned, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      id,
      data.notebook_id,
      data.title ?? 'Başlıksız Not',
      data.content ?? '',
      data.content_text ?? '',
      now,
      now
    );

    return this.getById(id)!;
  },

  update(id: string, data: Partial<{
    title: string;
    content: string;
    content_text: string;
    is_pinned: number;
    sort_order: number;
  }>): NoteRow | undefined {
    const now = Date.now();
    if (Object.keys(data).length === 0) return this.getById(id);

    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), now, id];

    getDb().prepare(`UPDATE notes SET ${fields}, updated_at = ? WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
  },

  pin(id: string, pinned: boolean): NoteRow | undefined {
    return this.update(id, { is_pinned: pinned ? 1 : 0 });
  },

  search(query: string): SearchResult[] {
    const sanitized = query.trim().replace(/['"*]/g, '') + '*';
    try {
      return getDb().prepare(`
        SELECT n.id, n.notebook_id, n.title, n.content_text,
               snippet(notes_fts, 1, '<mark>', '</mark>', '...', 20) as snippet,
               nb.name as notebook_name, n.updated_at
        FROM notes_fts
        JOIN notes n ON notes_fts.rowid = n.rowid
        JOIN notebooks nb ON n.notebook_id = nb.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `).all(sanitized) as SearchResult[];
    } catch {
      return [];
    }
  }
};
