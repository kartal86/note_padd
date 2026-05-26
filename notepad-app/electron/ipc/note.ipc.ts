import { ipcMain } from 'electron';
import { noteRepo } from '../database/repositories/note.repo';

export function registerNoteIPC(): void {
  ipcMain.handle('note:getByNotebook', async (_event, notebookId: string) => {
    try {
      const data = noteRepo.getByNotebook(notebookId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('note:getById', async (_event, id: string) => {
    try {
      const data = noteRepo.getById(id);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('note:create', async (_event, data: { notebook_id: string; title?: string }) => {
    try {
      const note = noteRepo.create(data);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('note:update', async (_event, id: string, data: {
    title?: string;
    content?: string;
    content_text?: string;
    is_pinned?: number;
  }) => {
    try {
      const note = noteRepo.update(id, data);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('note:delete', async (_event, id: string) => {
    try {
      noteRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('note:search', async (_event, query: string) => {
    try {
      const data = noteRepo.search(query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('note:pin', async (_event, id: string, pinned: boolean) => {
    try {
      const note = noteRepo.pin(id, pinned);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
