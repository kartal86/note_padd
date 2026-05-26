import { ipcMain, dialog } from 'electron';
import { imageService } from '../services/image.service';
import * as fs from 'fs';
import * as path from 'path';

export function registerImageIPC(): void {
  ipcMain.handle('image:save', async (_event, noteId: string, buffer: ArrayBuffer, mimeType: string) => {
    try {
      const uint8Array = new Uint8Array(buffer);
      const result = await imageService.saveImage(noteId, Buffer.from(uint8Array), mimeType);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('image:getPath', async (_event, filename: string) => {
    try {
      const filePath = imageService.getImagePath(filename);
      return { success: true, data: filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('image:openDialog', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }

      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

      const stats = fs.statSync(filePath);
      if (stats.size > 20 * 1024 * 1024) {
        return { success: false, error: 'Dosya boyutu 20MB sınırını aşıyor' };
      }

      return { success: true, data: { buffer: Array.from(buffer), mimeType, originalPath: filePath } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
