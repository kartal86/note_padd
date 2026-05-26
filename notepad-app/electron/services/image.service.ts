import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db';

const SUPPORTED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

class ImageService {
  private imagesDir: string;

  constructor() {
    this.imagesDir = '';
  }

  init(): void {
    this.imagesDir = path.join(app.getPath('userData'), 'images');
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  async saveImage(noteId: string, buffer: Buffer, mimeType: string): Promise<{ id: string; filename: string; path: string }> {
    if (!SUPPORTED_TYPES[mimeType]) {
      throw new Error(`Desteklenmeyen dosya türü: ${mimeType}`);
    }

    if (buffer.length > MAX_SIZE) {
      throw new Error('Dosya boyutu 20MB sınırını aşıyor');
    }

    const ext = SUPPORTED_TYPES[mimeType];
    const id = uuidv4();
    const filename = `${id}.${ext}`;
    const filePath = path.join(this.imagesDir, filename);

    fs.writeFileSync(filePath, buffer);

    // Save to database
    const now = Date.now();
    getDb().prepare(`
      INSERT INTO images (id, note_id, filename, mime_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, noteId, filename, mimeType, buffer.length, now);

    return { id, filename, path: filePath };
  }

  getImagePath(filename: string): string {
    return path.join(this.imagesDir, filename);
  }

  deleteImage(filename: string): void {
    const filePath = path.join(this.imagesDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const imageService = new ImageService();
export { ImageService };
