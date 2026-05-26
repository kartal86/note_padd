import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface ReminderRow {
  id: string;
  note_id: string | null;
  title: string;
  body: string;
  fire_at: number;
  repeat: 'none' | 'daily' | 'weekly';
  is_done: number;
  created_at: number;
  updated_at: number;
}

export const reminderRepo = {
  getAll(): ReminderRow[] {
    return getDb().prepare('SELECT * FROM reminders ORDER BY fire_at ASC').all() as ReminderRow[];
  },

  getById(id: string): ReminderRow | undefined {
    return getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(id) as ReminderRow | undefined;
  },

  getPending(): ReminderRow[] {
    return getDb().prepare(`
      SELECT * FROM reminders
      WHERE is_done = 0 AND fire_at <= ?
      ORDER BY fire_at ASC
    `).all(Date.now()) as ReminderRow[];
  },

  create(data: {
    title: string;
    body?: string;
    fire_at: number;
    repeat?: 'none' | 'daily' | 'weekly';
    note_id?: string | null;
  }): ReminderRow {
    const id = uuidv4();
    const now = Date.now();

    getDb().prepare(`
      INSERT INTO reminders (id, note_id, title, body, fire_at, repeat, is_done, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      data.note_id ?? null,
      data.title,
      data.body ?? '',
      data.fire_at,
      data.repeat ?? 'none',
      now,
      now
    );

    return this.getById(id)!;
  },

  update(id: string, data: Partial<{
    title: string;
    body: string;
    fire_at: number;
    repeat: string;
    is_done: number;
    note_id: string | null;
  }>): ReminderRow | undefined {
    const now = Date.now();
    if (Object.keys(data).length === 0) return this.getById(id);

    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), now, id];

    getDb().prepare(`UPDATE reminders SET ${fields}, updated_at = ? WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  markDone(id: string): ReminderRow | undefined {
    return this.update(id, { is_done: 1 });
  },

  advanceRepeat(id: string): ReminderRow | undefined {
    const reminder = this.getById(id);
    if (!reminder) return undefined;

    let nextFireAt = reminder.fire_at;
    if (reminder.repeat === 'daily') {
      nextFireAt += 24 * 60 * 60 * 1000;
    } else if (reminder.repeat === 'weekly') {
      nextFireAt += 7 * 24 * 60 * 60 * 1000;
    }

    return this.update(id, { fire_at: nextFireAt });
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM reminders WHERE id = ?').run(id);
  }
};
