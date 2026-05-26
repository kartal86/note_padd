import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from './database/db';
import { registerNotebookIPC } from './ipc/notebook.ipc';
import { registerNoteIPC } from './ipc/note.ipc';
import { registerReminderIPC } from './ipc/reminder.ipc';
import { registerImageIPC } from './ipc/image.ipc';
import { imageService } from './services/image.service';
import { reminderService } from './services/reminder.service';

// Settings file path
function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): Record<string, unknown> {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSettings(settings: Record<string, unknown>): void {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Settings save error:', e);
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // Not in squirrel environment
}

// Disable hardware acceleration for better compatibility
// app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const settings = loadSettings();
  const bounds = (settings.windowBounds as { x: number; y: number; width: number; height: number }) ?? {
    x: undefined,
    y: undefined,
    width: 1280,
    height: 800
  };

  const defaultPreload = path.join(__dirname, '../preload/index.js');
  const fallbackPreload = path.join(__dirname, '../out/preload/index.js');

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width ?? 1280,
    height: bounds.height ?? 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: fs.existsSync(defaultPreload) ? defaultPreload : fallbackPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for better-sqlite3
      webSecurity: true,
    },
    backgroundColor: '#1a1a1a',
    show: false,
  });

  // Show window when ready (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window bounds on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const b = mainWindow.getBounds();
      const settings = loadSettings();
      settings.windowBounds = b;
      saveSettings(settings);
    }
  });

  // Load app
  const isDev = process.env.NODE_ENV === 'development' || !!process.env['ELECTRON_RENDERER_URL'];

  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const defaultIndex = path.join(__dirname, '../renderer/index.html');
    const fallbackIndex = path.join(__dirname, '../out/renderer/index.html');
    const loadFilePath = fs.existsSync(defaultIndex) ? defaultIndex : fallbackIndex;
    mainWindow.loadFile(loadFilePath);
  }

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (line ${line})`);
  });
}

// Register appimage:// protocol for serving images
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'appimage',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    }
  }
]);

app.whenReady().then(() => {
  // Register custom protocol for images
  protocol.handle('appimage', (request) => {
    const filename = decodeURIComponent(request.url.replace('appimage://', ''));
    const filePath = imageService.getImagePath(filename);
    return net.fetch(`file://${filePath}`);
  });

  // Initialize database
  initDb();

  // Initialize services
  imageService.init();

  // Register IPC handlers
  registerNotebookIPC();
  registerNoteIPC();
  registerImageIPC();

  // Create main window first
  createWindow();

  // Register reminder IPC after window created
  if (mainWindow) {
    registerReminderIPC(mainWindow);
    reminderService.init(mainWindow);
  }

  // Settings IPC
  ipcMain.handle('app:getTheme', async () => {
    const settings = loadSettings();
    return { success: true, data: settings.theme ?? 'dark' };
  });

  ipcMain.handle('app:setTheme', async (_event, theme: string) => {
    const settings = loadSettings();
    settings.theme = theme;
    saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle('app:getSettings', async () => {
    const settings = loadSettings();
    return { success: true, data: settings };
  });

  ipcMain.handle('app:saveSettings', async (_event, data: Record<string, unknown>) => {
    const settings = loadSettings();
    Object.assign(settings, data);
    saveSettings(settings);
    return { success: true };
  });

  // Window control IPC
  ipcMain.handle('window:minimize', async () => {
    mainWindow?.minimize();
    return { success: true };
  });

  ipcMain.handle('window:maximize', async () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
    return { success: true };
  });

  ipcMain.handle('window:close', async () => {
    mainWindow?.close();
    return { success: true };
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  reminderService.stop();
  closeDb();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
