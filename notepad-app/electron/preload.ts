import { contextBridge, ipcRenderer } from 'electron';

// Expose typed API to renderer process
contextBridge.exposeInMainWorld('api', {
  // Notebook
  getNotebooks: () => ipcRenderer.invoke('notebook:getAll'),
  createNotebook: (data: { name: string; color?: string; icon?: string }) =>
    ipcRenderer.invoke('notebook:create', data),
  updateNotebook: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    ipcRenderer.invoke('notebook:update', id, data),
  deleteNotebook: (id: string) => ipcRenderer.invoke('notebook:delete', id),

  // Note
  getNotes: (notebookId: string) => ipcRenderer.invoke('note:getByNotebook', notebookId),
  getNoteById: (id: string) => ipcRenderer.invoke('note:getById', id),
  createNote: (data: { notebook_id: string; title?: string }) =>
    ipcRenderer.invoke('note:create', data),
  updateNote: (id: string, data: {
    title?: string;
    content?: string;
    content_text?: string;
    is_pinned?: number;
  }) => ipcRenderer.invoke('note:update', id, data),
  deleteNote: (id: string) => ipcRenderer.invoke('note:delete', id),
  searchNotes: (query: string) => ipcRenderer.invoke('note:search', query),
  pinNote: (id: string, pinned: boolean) => ipcRenderer.invoke('note:pin', id, pinned),

  // Image
  saveImage: (noteId: string, buffer: ArrayBuffer, mimeType: string) =>
    ipcRenderer.invoke('image:save', noteId, buffer, mimeType),
  getImagePath: (filename: string) => ipcRenderer.invoke('image:getPath', filename),
  openImageDialog: () => ipcRenderer.invoke('image:openDialog'),

  // Reminder
  getReminders: () => ipcRenderer.invoke('reminder:getAll'),
  createReminder: (data: {
    title: string;
    body?: string;
    fire_at: number;
    repeat?: 'none' | 'daily' | 'weekly';
    note_id?: string | null;
  }) => ipcRenderer.invoke('reminder:create', data),
  updateReminder: (id: string, data: {
    title?: string;
    body?: string;
    fire_at?: number;
    repeat?: string;
    note_id?: string | null;
  }) => ipcRenderer.invoke('reminder:update', id, data),
  deleteReminder: (id: string) => ipcRenderer.invoke('reminder:delete', id),
  markReminderDone: (id: string) => ipcRenderer.invoke('reminder:markDone', id),

  // Theme / Settings
  getTheme: () => ipcRenderer.invoke('app:getTheme'),
  setTheme: (theme: string) => ipcRenderer.invoke('app:setTheme', theme),
  getSettings: () => ipcRenderer.invoke('app:getSettings'),
  saveSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('app:saveSettings', data),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Events (main → renderer)
  onReminderFired: (cb: (data: { id: string; title: string; body: string }) => void) => {
    ipcRenderer.on('reminder:fired', (_event, data) => cb(data));
  },
  offReminderFired: () => {
    ipcRenderer.removeAllListeners('reminder:fired');
  },
});
