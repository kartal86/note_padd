"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const uuid = require("uuid");
const notifier = require("node-notifier");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
let db = null;
function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
function initDb() {
  const userDataPath = electron.app.getPath("userData");
  const dbPath = path__namespace.join(userDataPath, "notepad.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  runMigrations(db);
  return db;
}
function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    )
  `);
  const possibleDirs = [
    path__namespace.join(__dirname, "database", "migrations"),
    path__namespace.join(__dirname, "..", "electron", "database", "migrations"),
    path__namespace.join(process.cwd(), "electron", "database", "migrations"),
    path__namespace.join(__dirname, "migrations")
  ];
  let migDir = null;
  for (const dir of possibleDirs) {
    if (fs__namespace.existsSync(dir)) {
      migDir = dir;
      break;
    }
  }
  if (!migDir) {
    console.log("Using inline migrations");
    runInlineMigrations(database);
    return;
  }
  const files = fs__namespace.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
  const applied = database.prepare("SELECT filename FROM _migrations").all();
  const appliedSet = new Set(applied.map((r) => r.filename));
  for (const file of files) {
    if (!appliedSet.has(file)) {
      const sql = fs__namespace.readFileSync(path__namespace.join(migDir, file), "utf8");
      database.exec(sql);
      database.prepare("INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)").run(file, Date.now());
      console.log(`Applied migration: ${file}`);
    }
  }
}
function runInlineMigrations(database) {
  const applied = database.prepare("SELECT filename FROM _migrations").all();
  const appliedSet = new Set(applied.map((r) => r.filename));
  if (!appliedSet.has("001_initial.sql")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS notebooks (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        color       TEXT DEFAULT '#6366f1',
        icon        TEXT DEFAULT '📓',
        sort_order  INTEGER DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id           TEXT PRIMARY KEY,
        notebook_id  TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
        title        TEXT NOT NULL DEFAULT 'Başlıksız Not',
        content      TEXT NOT NULL DEFAULT '',
        content_text TEXT NOT NULL DEFAULT '',
        is_pinned    INTEGER DEFAULT 0,
        sort_order   INTEGER DEFAULT 0,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id          TEXT PRIMARY KEY,
        note_id     TEXT REFERENCES notes(id) ON DELETE SET NULL,
        title       TEXT NOT NULL,
        body        TEXT DEFAULT '',
        fire_at     INTEGER NOT NULL,
        repeat      TEXT DEFAULT 'none',
        is_done     INTEGER DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS images (
        id          TEXT PRIMARY KEY,
        note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        filename    TEXT NOT NULL,
        mime_type   TEXT NOT NULL,
        size_bytes  INTEGER NOT NULL,
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    database.prepare("INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)").run("001_initial.sql", Date.now());
  }
  if (!appliedSet.has("002_fts.sql")) {
    database.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title,
        content_text,
        content='notes',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content_text)
        VALUES (new.rowid, new.title, new.content_text);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content_text)
        VALUES ('delete', old.rowid, old.title, old.content_text);
        INSERT INTO notes_fts(rowid, title, content_text)
        VALUES (new.rowid, new.title, new.content_text);
      END;

      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, title, content_text)
        VALUES ('delete', old.rowid, old.title, old.content_text);
      END;
    `);
    database.prepare("INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)").run("002_fts.sql", Date.now());
  }
}
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
const notebookRepo = {
  getAll() {
    return getDb().prepare("SELECT * FROM notebooks ORDER BY sort_order ASC, created_at ASC").all();
  },
  getById(id) {
    return getDb().prepare("SELECT * FROM notebooks WHERE id = ?").get(id);
  },
  create(data) {
    const id = uuid.v4();
    const now = Date.now();
    const maxOrder = getDb().prepare("SELECT MAX(sort_order) as m FROM notebooks").get().m ?? -1;
    getDb().prepare(`
      INSERT INTO notebooks (id, name, color, icon, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.color ?? "#6366f1", data.icon ?? "📓", maxOrder + 1, now, now);
    return this.getById(id);
  },
  update(id, data) {
    const now = Date.now();
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), now, id];
    getDb().prepare(`UPDATE notebooks SET ${fields}, updated_at = ? WHERE id = ?`).run(...values);
    return this.getById(id);
  },
  delete(id) {
    getDb().prepare("DELETE FROM notebooks WHERE id = ?").run(id);
  }
};
function registerNotebookIPC() {
  electron.ipcMain.handle("notebook:getAll", async () => {
    try {
      const data = notebookRepo.getAll();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("notebook:create", async (_event, data) => {
    try {
      const notebook = notebookRepo.create(data);
      return { success: true, data: notebook };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("notebook:update", async (_event, id, data) => {
    try {
      const notebook = notebookRepo.update(id, data);
      return { success: true, data: notebook };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("notebook:delete", async (_event, id) => {
    try {
      notebookRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
const noteRepo = {
  getByNotebook(notebookId) {
    return getDb().prepare(`
      SELECT * FROM notes
      WHERE notebook_id = ?
      ORDER BY is_pinned DESC, updated_at DESC
    `).all(notebookId);
  },
  getById(id) {
    return getDb().prepare("SELECT * FROM notes WHERE id = ?").get(id);
  },
  create(data) {
    const id = uuid.v4();
    const now = Date.now();
    getDb().prepare(`
      INSERT INTO notes (id, notebook_id, title, content, content_text, is_pinned, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(
      id,
      data.notebook_id,
      data.title ?? "Başlıksız Not",
      data.content ?? "",
      data.content_text ?? "",
      now,
      now
    );
    return this.getById(id);
  },
  update(id, data) {
    const now = Date.now();
    if (Object.keys(data).length === 0) return this.getById(id);
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), now, id];
    getDb().prepare(`UPDATE notes SET ${fields}, updated_at = ? WHERE id = ?`).run(...values);
    return this.getById(id);
  },
  delete(id) {
    getDb().prepare("DELETE FROM notes WHERE id = ?").run(id);
  },
  pin(id, pinned) {
    return this.update(id, { is_pinned: pinned ? 1 : 0 });
  },
  search(query) {
    const sanitized = query.trim().replace(/['"*]/g, "") + "*";
    try {
      return getDb().prepare(`
        SELECT n.id, n.notebook_id, n.title, n.content_text,
               snippet(notes_fts, 1, '<mark>', '</mark>', '...', 20) as snippet,
               nb.name as notebook_name, n.updated_at
        FROM notes_fts
        JOIN notes n ON notes_fts.rowid = n.rowid
        JOIN notebooks nb ON n.notebook_id = nb.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `).all(sanitized);
    } catch {
      return [];
    }
  }
};
function registerNoteIPC() {
  electron.ipcMain.handle("note:getByNotebook", async (_event, notebookId) => {
    try {
      const data = noteRepo.getByNotebook(notebookId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("note:getById", async (_event, id) => {
    try {
      const data = noteRepo.getById(id);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("note:create", async (_event, data) => {
    try {
      const note = noteRepo.create(data);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("note:update", async (_event, id, data) => {
    try {
      const note = noteRepo.update(id, data);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("note:delete", async (_event, id) => {
    try {
      noteRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("note:search", async (_event, query) => {
    try {
      const data = noteRepo.search(query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("note:pin", async (_event, id, pinned) => {
    try {
      const note = noteRepo.pin(id, pinned);
      return { success: true, data: note };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
const reminderRepo = {
  getAll() {
    return getDb().prepare("SELECT * FROM reminders ORDER BY fire_at ASC").all();
  },
  getById(id) {
    return getDb().prepare("SELECT * FROM reminders WHERE id = ?").get(id);
  },
  getPending() {
    return getDb().prepare(`
      SELECT * FROM reminders
      WHERE is_done = 0 AND fire_at <= ?
      ORDER BY fire_at ASC
    `).all(Date.now());
  },
  create(data) {
    const id = uuid.v4();
    const now = Date.now();
    getDb().prepare(`
      INSERT INTO reminders (id, note_id, title, body, fire_at, repeat, is_done, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      data.note_id ?? null,
      data.title,
      data.body ?? "",
      data.fire_at,
      data.repeat ?? "none",
      now,
      now
    );
    return this.getById(id);
  },
  update(id, data) {
    const now = Date.now();
    if (Object.keys(data).length === 0) return this.getById(id);
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), now, id];
    getDb().prepare(`UPDATE reminders SET ${fields}, updated_at = ? WHERE id = ?`).run(...values);
    return this.getById(id);
  },
  markDone(id) {
    return this.update(id, { is_done: 1 });
  },
  advanceRepeat(id) {
    const reminder = this.getById(id);
    if (!reminder) return void 0;
    let nextFireAt = reminder.fire_at;
    if (reminder.repeat === "daily") {
      nextFireAt += 24 * 60 * 60 * 1e3;
    } else if (reminder.repeat === "weekly") {
      nextFireAt += 7 * 24 * 60 * 60 * 1e3;
    }
    return this.update(id, { fire_at: nextFireAt });
  },
  delete(id) {
    getDb().prepare("DELETE FROM reminders WHERE id = ?").run(id);
  }
};
function registerReminderIPC(mainWindow2) {
  electron.ipcMain.handle("reminder:getAll", async () => {
    try {
      const data = reminderRepo.getAll();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("reminder:create", async (_event, data) => {
    try {
      const reminder = reminderRepo.create(data);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("reminder:update", async (_event, id, data) => {
    try {
      const reminder = reminderRepo.update(id, data);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("reminder:delete", async (_event, id) => {
    try {
      reminderRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("reminder:markDone", async (_event, id) => {
    try {
      const reminder = reminderRepo.markDone(id);
      return { success: true, data: reminder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
const SUPPORTED_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp"
};
const MAX_SIZE = 20 * 1024 * 1024;
class ImageService {
  imagesDir;
  constructor() {
    this.imagesDir = "";
  }
  init() {
    this.imagesDir = path__namespace.join(electron.app.getPath("userData"), "images");
    if (!fs__namespace.existsSync(this.imagesDir)) {
      fs__namespace.mkdirSync(this.imagesDir, { recursive: true });
    }
  }
  async saveImage(noteId, buffer, mimeType) {
    if (!SUPPORTED_TYPES[mimeType]) {
      throw new Error(`Desteklenmeyen dosya türü: ${mimeType}`);
    }
    if (buffer.length > MAX_SIZE) {
      throw new Error("Dosya boyutu 20MB sınırını aşıyor");
    }
    const ext = SUPPORTED_TYPES[mimeType];
    const id = uuid.v4();
    const filename = `${id}.${ext}`;
    const filePath = path__namespace.join(this.imagesDir, filename);
    fs__namespace.writeFileSync(filePath, buffer);
    const now = Date.now();
    getDb().prepare(`
      INSERT INTO images (id, note_id, filename, mime_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, noteId, filename, mimeType, buffer.length, now);
    return { id, filename, path: filePath };
  }
  getImagePath(filename) {
    return path__namespace.join(this.imagesDir, filename);
  }
  deleteImage(filename) {
    const filePath = path__namespace.join(this.imagesDir, filename);
    if (fs__namespace.existsSync(filePath)) {
      fs__namespace.unlinkSync(filePath);
    }
  }
}
const imageService = new ImageService();
function registerImageIPC() {
  electron.ipcMain.handle("image:save", async (_event, noteId, buffer, mimeType) => {
    try {
      const uint8Array = new Uint8Array(buffer);
      const result = await imageService.saveImage(noteId, Buffer.from(uint8Array), mimeType);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("image:getPath", async (_event, filename) => {
    try {
      const filePath = imageService.getImagePath(filename);
      return { success: true, data: filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
  electron.ipcMain.handle("image:openDialog", async () => {
    try {
      const result = await electron.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }
        ]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }
      const filePath = result.filePaths[0];
      const buffer = fs__namespace.readFileSync(filePath);
      const ext = path__namespace.extname(filePath).toLowerCase().slice(1);
      const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      const stats = fs__namespace.statSync(filePath);
      if (stats.size > 20 * 1024 * 1024) {
        return { success: false, error: "Dosya boyutu 20MB sınırını aşıyor" };
      }
      return { success: true, data: { buffer: Array.from(buffer), mimeType, originalPath: filePath } };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
class ReminderService {
  intervalId = null;
  mainWindow = null;
  init(mainWindow2) {
    this.mainWindow = mainWindow2;
    this.checkReminders();
    this.intervalId = setInterval(() => this.checkReminders(), 60 * 1e3);
  }
  checkReminders() {
    try {
      const pending = reminderRepo.getPending();
      for (const reminder of pending) {
        this.fireReminder(reminder);
        if (reminder.repeat !== "none") {
          reminderRepo.advanceRepeat(reminder.id);
        } else {
          reminderRepo.markDone(reminder.id);
        }
      }
    } catch (error) {
      console.error("Reminder check error:", error);
    }
  }
  fireReminder(reminder) {
    notifier.notify({
      title: "Kişisel Notlarım — " + reminder.title,
      message: reminder.body || "Hatırlatıcı zamanı geldi!",
      icon: path__namespace.join(__dirname, "../../assets/icon.ico"),
      sound: true,
      wait: false
    });
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("reminder:fired", {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body
      });
    }
  }
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
const reminderService = new ReminderService();
function getSettingsPath() {
  return path__namespace.join(electron.app.getPath("userData"), "settings.json");
}
function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs__namespace.existsSync(p)) {
      return JSON.parse(fs__namespace.readFileSync(p, "utf8"));
    }
  } catch {
  }
  return {};
}
function saveSettings(settings) {
  try {
    fs__namespace.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), "utf8");
  } catch (e) {
    console.error("Settings save error:", e);
  }
}
try {
  if (require("electron-squirrel-startup")) {
    electron.app.quit();
  }
} catch {
}
let mainWindow = null;
function createWindow() {
  const settings = loadSettings();
  const bounds = settings.windowBounds ?? {
    x: void 0,
    y: void 0,
    width: 1280,
    height: 800
  };
  const defaultPreload = path__namespace.join(__dirname, "../preload/index.js");
  const fallbackPreload = path__namespace.join(__dirname, "../out/preload/index.js");
  mainWindow = new electron.BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width ?? 1280,
    height: bounds.height ?? 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: fs__namespace.existsSync(defaultPreload) ? defaultPreload : fallbackPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // required for better-sqlite3
      webSecurity: true
    },
    backgroundColor: "#1a1a1a",
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("close", () => {
    if (mainWindow) {
      const b = mainWindow.getBounds();
      const settings2 = loadSettings();
      settings2.windowBounds = b;
      saveSettings(settings2);
    }
  });
  const isDev = process.env.NODE_ENV === "development" || !!process.env["ELECTRON_RENDERER_URL"];
  if (isDev) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] || "http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const defaultIndex = path__namespace.join(__dirname, "../renderer/index.html");
    const fallbackIndex = path__namespace.join(__dirname, "../out/renderer/index.html");
    const loadFilePath = fs__namespace.existsSync(defaultIndex) ? defaultIndex : fallbackIndex;
    mainWindow.loadFile(loadFilePath);
  }
  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (line ${line})`);
  });
}
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "appimage",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
]);
electron.app.whenReady().then(() => {
  electron.protocol.handle("appimage", (request) => {
    const filename = decodeURIComponent(request.url.replace("appimage://", ""));
    const filePath = imageService.getImagePath(filename);
    return electron.net.fetch(`file://${filePath}`);
  });
  initDb();
  imageService.init();
  registerNotebookIPC();
  registerNoteIPC();
  registerImageIPC();
  createWindow();
  if (mainWindow) {
    registerReminderIPC();
    reminderService.init(mainWindow);
  }
  electron.ipcMain.handle("app:getTheme", async () => {
    const settings = loadSettings();
    return { success: true, data: settings.theme ?? "dark" };
  });
  electron.ipcMain.handle("app:setTheme", async (_event, theme) => {
    const settings = loadSettings();
    settings.theme = theme;
    saveSettings(settings);
    return { success: true };
  });
  electron.ipcMain.handle("app:getSettings", async () => {
    const settings = loadSettings();
    return { success: true, data: settings };
  });
  electron.ipcMain.handle("app:saveSettings", async (_event, data) => {
    const settings = loadSettings();
    Object.assign(settings, data);
    saveSettings(settings);
    return { success: true };
  });
  electron.ipcMain.handle("window:minimize", async () => {
    mainWindow?.minimize();
    return { success: true };
  });
  electron.ipcMain.handle("window:maximize", async () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
    return { success: true };
  });
  electron.ipcMain.handle("window:close", async () => {
    mainWindow?.close();
    return { success: true };
  });
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  reminderService.stop();
  closeDb();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
