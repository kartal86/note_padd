export interface Notebook {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Note {
  id: string;
  notebook_id: string;
  title: string;
  content: string;       // Tiptap JSON string
  content_text: string;  // düz metin
  is_pinned: boolean;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

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

export interface Reminder {
  id: string;
  note_id: string | null;
  title: string;
  body: string;
  fire_at: number;
  repeat: 'none' | 'daily' | 'weekly';
  is_done: boolean;
  created_at: number;
  updated_at: number;
}

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

export interface NoteImage {
  id: string;
  note_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
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

export type Theme = 'dark' | 'light';

export interface AppSettings {
  theme: Theme;
  lastNotebookId?: string;
  lastNoteId?: string;
  windowBounds?: { x: number; y: number; width: number; height: number };
}

// Window API types
export interface WindowAPI {
  // Notebook
  getNotebooks: () => Promise<{ success: boolean; data?: Notebook[]; error?: string }>;
  createNotebook: (data: { name: string; color?: string; icon?: string }) => Promise<{ success: boolean; data?: Notebook; error?: string }>;
  updateNotebook: (id: string, data: { name?: string; color?: string; icon?: string }) => Promise<{ success: boolean; data?: Notebook; error?: string }>;
  deleteNotebook: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Note
  getNotes: (notebookId: string) => Promise<{ success: boolean; data?: NoteRow[]; error?: string }>;
  getNoteById: (id: string) => Promise<{ success: boolean; data?: NoteRow; error?: string }>;
  createNote: (data: { notebook_id: string; title?: string }) => Promise<{ success: boolean; data?: NoteRow; error?: string }>;
  updateNote: (id: string, data: { title?: string; content?: string; content_text?: string; is_pinned?: number }) => Promise<{ success: boolean; data?: NoteRow; error?: string }>;
  deleteNote: (id: string) => Promise<{ success: boolean; error?: string }>;
  searchNotes: (query: string) => Promise<{ success: boolean; data?: SearchResult[]; error?: string }>;
  pinNote: (id: string, pinned: boolean) => Promise<{ success: boolean; data?: NoteRow; error?: string }>;

  // Image
  saveImage: (noteId: string, buffer: ArrayBuffer, mimeType: string) => Promise<{ success: boolean; data?: { id: string; filename: string }; error?: string }>;
  getImagePath: (filename: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  openImageDialog: () => Promise<{ success: boolean; data?: { buffer: number[]; mimeType: string } | null; error?: string }>;

  // Reminder
  getReminders: () => Promise<{ success: boolean; data?: ReminderRow[]; error?: string }>;
  createReminder: (data: { title: string; body?: string; fire_at: number; repeat?: 'none' | 'daily' | 'weekly'; note_id?: string | null }) => Promise<{ success: boolean; data?: ReminderRow; error?: string }>;
  updateReminder: (id: string, data: { title?: string; body?: string; fire_at?: number; repeat?: string; note_id?: string | null }) => Promise<{ success: boolean; data?: ReminderRow; error?: string }>;
  deleteReminder: (id: string) => Promise<{ success: boolean; error?: string }>;
  markReminderDone: (id: string) => Promise<{ success: boolean; data?: ReminderRow; error?: string }>;

  // Theme / Settings
  getTheme: () => Promise<{ success: boolean; data?: string; error?: string }>;
  setTheme: (theme: string) => Promise<{ success: boolean; error?: string }>;
  getSettings: () => Promise<{ success: boolean; data?: AppSettings; error?: string }>;
  saveSettings: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;

  // Window controls
  minimizeWindow: () => Promise<{ success: boolean }>;
  maximizeWindow: () => Promise<{ success: boolean }>;
  closeWindow: () => Promise<{ success: boolean }>;

  // Events
  onReminderFired: (cb: (data: { id: string; title: string; body: string }) => void) => void;
  offReminderFired: () => void;
}

declare global {
  interface Window {
    api: WindowAPI;
  }
}
