import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface NotebookRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export const notebookRepo = {
  getAll(): NotebookRow[] {
    return getDb().prepare('SELECT * FROM notebooks ORDER BY sort_order ASC, created_at ASC').all() as NotebookRow[];
  },

  getById(id: string): NotebookRow | undefined {
    return getDb().prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as NotebookRow | undefined;
  },

  create(data: { name: string; color?: string; icon?: string }): NotebookRow {
    const id = uuidv4();
    const now = Date.now();
    const maxOrder = (getDb().prepare('SELECT MAX(sort_order) as m FROM notebooks').get() as { m: number | null }).m ?? -1;

    getDb().prepare(`
      INSERT INTO notebooks (id, name, color, icon, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.color ?? '#6366f1', data.icon ?? '📓', maxOrder + 1, now, now);

    return this.getById(id)!;
  },

  update(id: string, data: Partial<{ name: string; color: string; icon: string; sort_order: number }>): NotebookRow | undefined {
    const now = Date.now();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), now, id];

    getDb().prepare(`UPDATE notebooks SET ${fields}, updated_at = ? WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM notebooks WHERE id = ?').run(id);
  }
};
