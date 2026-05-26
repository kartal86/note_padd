import { ipcMain, BrowserWindow } from 'electron';
import { reminderRepo } from '../database/repositories/reminder.repo';

export function registerReminderIPC(mainWindow: BrowserWindow): void {
  ipcMain.handle('reminder:getAll', async () => {
    try {
      const data = reminderRepo.getAll();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reminder:create', async (_event, data: {
    title: string;
    body?: string;
    fire_at: number;
    repeat?: 'none' | 'daily' | 'weekly';
    note_id?: string | null;
  }) => {
    try {
      const reminder = reminderRepo.create(data);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reminder:update', async (_event, id: string, data: {
    title?: string;
    body?: string;
    fire_at?: number;
    repeat?: string;
    note_id?: string | null;
  }) => {
    try {
      const reminder = reminderRepo.update(id, data);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reminder:delete', async (_event, id: string) => {
    try {
      reminderRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reminder:markDone', async (_event, id: string) => {
    try {
      const reminder = reminderRepo.markDone(id);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
