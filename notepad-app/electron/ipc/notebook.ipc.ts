import { ipcMain } from 'electron';
import { notebookRepo } from '../database/repositories/notebook.repo';

export function registerNotebookIPC(): void {
  ipcMain.handle('notebook:getAll', async () => {
    try {
      const data = notebookRepo.getAll();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('notebook:create', async (_event, data: { name: string; color?: string; icon?: string }) => {
    try {
      const notebook = notebookRepo.create(data);
      return { success: true, data: notebook };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('notebook:update', async (_event, id: string, data: { name?: string; color?: string; icon?: string }) => {
    try {
      const notebook = notebookRepo.update(id, data);
      return { success: true, data: notebook };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('notebook:delete', async (_event, id: string) => {
    try {
      notebookRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
