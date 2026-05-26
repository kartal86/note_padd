# CLAUDE.md — Kişisel Masaüstü Not Uygulaması

> Bu dosya bir AI coding agent'ına yönelik yazılmıştır. Her bölümü dikkatle oku,
> hiçbir adımı atlamadan, sırasıyla uygula.

---

## 1. PROJE GENEL BAKIŞ

### 1.1 Amaç
Tek kullanıcıya özel, tamamen yerel (offline-first), Windows masaüstü not uygulaması.
Bulut bağlantısı yoktur. Veriler yalnızca kullanıcının makinesinde saklanır.

### 1.2 Temel İlkeler
- **Sadelik önce gelir.** Her özellik, "gerçekten gerekli mi?" sorusundan geçmelidir.
- **Fonksiyonellik şart.** Görsel şıklık asla işlevsellikten önce gelmez.
- **Sıfır bağımlılık politikası.** Gereksiz npm paketi ekleme; her bağımlılık gerekçelendirilmelidir.
- **Yerel veri egemenliği.** Hiçbir veri dışarıya çıkmaz; telemetri, analytics, update-check yoktur.

---

## 2. TEKNOLOJİ YIĞINI (TECH STACK)

### 2.1 Seçim: Electron + React + TypeScript

**Neden Electron (Tauri değil)?**
- Windows-only hedef → Tauri'nin cross-platform avantajı gereksiz
- Electron ekosistemi daha olgun; `electron-builder` ile `.exe` installer üretimi kolay
- `better-sqlite3` native binding'i Electron ile doğrudan çalışır
- Geliştirici deneyimi ve debug tooling üstün

**Neden React + TypeScript?**
- Rich text editor kütüphaneleri (Tiptap) React ekosisteminde en iyi desteğe sahip
- TypeScript: veri modeli hatalarını derleme zamanında yakalar

**Neden SQLite (better-sqlite3)?**
- Dosya tabanlı → taşınabilir, yedeklenmesi kolay
- Tam metin arama için SQLite FTS5 extension yerleşik gelir
- JSON sütunları ile esnek şema

### 2.2 Paket Listesi

```
Üretim bağımlılıkları:
  electron                  → masaüstü runtime
  @electron/remote          → renderer-main köprüsü (gerektiğinde)
  react + react-dom         → UI framework
  @tiptap/react             → rich text editor çekirdeği
  @tiptap/starter-kit       → temel uzantılar (bold, italic, list, vb.)
  @tiptap/extension-image   → inline resim desteği
  @tiptap/extension-text-align → hizalama
  @tiptap/extension-task-list  → checkbox listesi
  better-sqlite3            → SQLite ORM-free driver
  date-fns                  → tarih formatlama
  node-notifier             → Windows toast bildirimi (hatırlatıcı)
  uuid                      → ID üretimi

Geliştirme bağımlılıkları:
  electron-builder          → .exe installer üretimi
  vite + @vitejs/plugin-react → hızlı build
  electron-vite             → Electron+Vite entegrasyonu
  typescript                → tip güvenliği
  @types/react @types/node  → tip tanımları
  eslint + prettier         → kod kalitesi
```

---

## 3. KLASÖR YAPISI

```
notepad-app/
├── CLAUDE.md                    ← bu dosya
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.config.js
│
├── electron/                    ← Main process (Node.js ortamı)
│   ├── main.ts                  → uygulama giriş noktası
│   ├── preload.ts               → contextBridge API tanımları
│   ├── database/
│   │   ├── db.ts                → SQLite bağlantısı ve migration runner
│   │   ├── migrations/
│   │   │   ├── 001_initial.sql  → temel şema
│   │   │   └── 002_fts.sql      → FTS5 virtual table
│   │   └── repositories/
│   │       ├── notebook.repo.ts
│   │       ├── note.repo.ts
│   │       └── reminder.repo.ts
│   ├── ipc/
│   │   ├── notebook.ipc.ts      → IPC handler'ları (notebook CRUD)
│   │   ├── note.ipc.ts          → IPC handler'ları (note CRUD + search)
│   │   ├── reminder.ipc.ts      → IPC handler'ları (reminder CRUD)
│   │   └── image.ipc.ts         → resim kaydetme / okuma
│   └── services/
│       ├── reminder.service.ts  → alarm scheduler (setInterval tabanlı)
│       └── image.service.ts     → resim dosya yönetimi
│
├── src/                         ← Renderer process (React ortamı)
│   ├── main.tsx                 → React entry point
│   ├── App.tsx                  → root component + theme provider
│   ├── types/
│   │   └── index.ts             → paylaşılan TypeScript interface'leri
│   ├── hooks/
│   │   ├── useNotes.ts
│   │   ├── useNotebooks.ts
│   │   ├── useReminders.ts
│   │   └── useTheme.ts
│   ├── store/
│   │   └── appStore.ts          → Zustand (veya useContext) global state
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      → notebook listesi + arama
│   │   │   ├── NoteList.tsx     → seçili notebook'un notları
│   │   │   └── EditorPane.tsx   → sağ panel (editor)
│   │   ├── editor/
│   │   │   ├── RichEditor.tsx   → Tiptap wrapper
│   │   │   ├── Toolbar.tsx      → format toolbar
│   │   │   └── ImageUpload.tsx  → drag-drop + clipboard resim
│   │   ├── reminders/
│   │   │   ├── ReminderModal.tsx
│   │   │   └── ReminderList.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── ContextMenu.tsx
│   │       └── ThemeToggle.tsx
│   └── styles/
│       ├── globals.css          → CSS variables (dark/light)
│       ├── editor.css           → Tiptap prose stilleri
│       └── scrollbar.css        → özel scrollbar
│
└── assets/
    ├── icon.ico                 → uygulama ikonu
    └── images/                  → kullanıcı resimlerinin kopyalandığı yer
        └── .gitkeep
```

---

## 4. VERİ MODELİ (SQLite Şeması)

### 4.1 Tablolar

```sql
-- 001_initial.sql

CREATE TABLE IF NOT EXISTS notebooks (
  id          TEXT PRIMARY KEY,          -- uuid v4
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#6366f1',    -- sidebar renk etiketi
  icon        TEXT DEFAULT '📓',
  sort_order  INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,          -- Unix timestamp (ms)
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  notebook_id  TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Başlıksız Not',
  content      TEXT NOT NULL DEFAULT '',  -- Tiptap JSON (stringify)
  content_text TEXT NOT NULL DEFAULT '',  -- düz metin (FTS için)
  is_pinned    INTEGER DEFAULT 0,         -- 0|1
  sort_order   INTEGER DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id          TEXT PRIMARY KEY,
  note_id     TEXT REFERENCES notes(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  fire_at     INTEGER NOT NULL,           -- Unix timestamp (ms)
  repeat      TEXT DEFAULT 'none',        -- none|daily|weekly
  is_done     INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,              -- assets/images/ içindeki dosya adı
  mime_type   TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

-- 002_fts.sql

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
```

### 4.2 TypeScript Interface'leri (`src/types/index.ts`)

```typescript
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

export interface NoteImage {
  id: string;
  note_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
}

export type Theme = 'dark' | 'light';
```

---

## 5. IPC MİMARİSİ (Main ↔ Renderer Köprüsü)

### 5.1 Preload API Sözleşmesi

`electron/preload.ts` dosyasında `contextBridge` ile aşağıdaki API'yi expose et:

```typescript
window.api = {
  // Notebook
  getNotebooks: () => ipcRenderer.invoke('notebook:getAll'),
  createNotebook: (data) => ipcRenderer.invoke('notebook:create', data),
  updateNotebook: (id, data) => ipcRenderer.invoke('notebook:update', id, data),
  deleteNotebook: (id) => ipcRenderer.invoke('notebook:delete', id),

  // Note
  getNotes: (notebookId) => ipcRenderer.invoke('note:getByNotebook', notebookId),
  getNoteById: (id) => ipcRenderer.invoke('note:getById', id),
  createNote: (data) => ipcRenderer.invoke('note:create', data),
  updateNote: (id, data) => ipcRenderer.invoke('note:update', id, data),
  deleteNote: (id) => ipcRenderer.invoke('note:delete', id),
  searchNotes: (query) => ipcRenderer.invoke('note:search', query),
  pinNote: (id, pinned) => ipcRenderer.invoke('note:pin', id, pinned),

  // Image
  saveImage: (noteId, buffer, mimeType) => ipcRenderer.invoke('image:save', noteId, buffer, mimeType),
  getImagePath: (filename) => ipcRenderer.invoke('image:getPath', filename),

  // Reminder
  getReminders: () => ipcRenderer.invoke('reminder:getAll'),
  createReminder: (data) => ipcRenderer.invoke('reminder:create', data),
  updateReminder: (id, data) => ipcRenderer.invoke('reminder:update', id, data),
  deleteReminder: (id) => ipcRenderer.invoke('reminder:delete', id),
  markReminderDone: (id) => ipcRenderer.invoke('reminder:markDone', id),

  // Theme
  getTheme: () => ipcRenderer.invoke('app:getTheme'),
  setTheme: (theme) => ipcRenderer.invoke('app:setTheme', theme),

  // Events (main → renderer)
  onReminderFired: (cb) => ipcRenderer.on('reminder:fired', (_, data) => cb(data)),
  offReminderFired: () => ipcRenderer.removeAllListeners('reminder:fired'),
}
```

### 5.2 IPC Handler Kuralları

- Her handler `try/catch` içinde olmalı; hata durumunda `{ success: false, error: string }` dön
- Başarıda `{ success: true, data: T }` dön
- Hiçbir handler'da doğrudan `dialog` veya UI işlemi yapma; bunlar renderer'da olmalı

---

## 6. UYGULAMA KATMANLARI — DETAYLI DAVRANIŞLAR

### 6.1 Sidebar (Sol Panel)

**Notebook Listesi:**
- Her notebook: ikon + isim + renk şeridi
- Sağ tık → context menu: Yeniden Adlandır / Rengi Değiştir / Sil
- Alt kısımda "+ Yeni Defter" butonu
- Notebook silinirken içindeki tüm notlar da silinir (CASCADE); kullanıcıya onay dialogu göster
- Hatırlatıcılar için ayrı bir sabit bölüm: "⏰ Hatırlatıcılar" linki

**Arama Kutusu:**
- Sidebar üstünde her zaman görünür
- Kullanıcı yazmaya başlayınca FTS5 sorgusu tetiklenir (debounce: 300ms)
- Sonuçlar tüm notebook'lardan gelir; her sonuçta notebook adı gösterilir
- Eşleşen metin snippet'i (içerik_text'in ilk 120 karakteri) gösterilir

### 6.2 Not Listesi (Orta Panel)

- Seçili notebook'un notları, `updated_at` DESC sıralı
- Pinned notlar daima üstte
- Her not kartında: başlık + tarih + içerik preview (ilk 80 karakter düz metin)
- Sağ tık → Sabitle / Sabiti Kaldır / Sil / Hatırlatıcı Ekle
- "+ Yeni Not" butonu üstte
- Notlar arası geçişte editör otomatik kaydeder (blur veya 2 saniyelik debounce)

### 6.3 Editör (Sağ Panel)

**Başlık Alanı:**
- Editörün en üstünde büyük, sade bir `<input>` — ayrı bir başlık alanı
- Tab veya Enter ile editöre geçiş

**Araç Çubuğu (Toolbar) — sadece gerekli olanlar:**

```
| B | I | U | S |  — kalın, italik, altı çizili, üstü çizili
|---|---|---|---|
| H1 | H2 | H3 |  — başlıklar
|---|---|---|
| • Liste | 1. Liste | ☑ Görev |  — liste türleri
|---|---|---|
| ← Hizala | = Orta | → Hizala |  — metin hizalama
|---|---|---|
| 🖼 Resim | ── Ayraç |  — resim ekle, yatay çizgi
```

Araç çubuğu sabit kalmalı (sticky), editör scroll'landığında kaybolmamalı.

**Resim Ekleme:**
1. Araç çubuğu butonuna tıklayınca Windows dosya seçici açılır (PNG, JPG, GIF, WEBP)
2. Editöre sürükle-bırak → `drop` event ile yakalanır
3. Pano'dan yapıştır (Ctrl+V) → `paste` event ile yakalanır
4. Resim `image:save` IPC ile `assets/images/` klasörüne kopyalanır
5. Editörde `<img src="appimage://filename">` protokolü kullanılır
6. Main process'te `app.setAsDefaultProtocolClient` yerine `protocol.registerFileProtocol('appimage', ...)` ile sunulur

**Otomatik Kaydetme:**
- Başlık veya içerik değiştiğinde 1500ms debounce ile `note:update` çağrılır
- Kaydetme durumu: sağ üstte küçük "Kaydedildi ✓" / "Kaydediliyor..." göstergesi

### 6.4 Hatırlatıcı Servisi

**Zamanlama Mekanizması:**
- `reminder.service.ts` main process'te çalışır
- Uygulama açıldığında ve her dakika başında bekleyen hatırlatıcılar kontrol edilir
- `fire_at <= Date.now()` ve `is_done = 0` koşulunu sağlayanlar tetiklenir
- Tetikleme: `node-notifier` ile Windows toast bildirimi
- Aynı anda renderer'a `reminder:fired` IPC event'i gönderilir (uygulama açıksa modal göster)
- Tekrarlayan hatırlatıcılarda `fire_at` bir sonraki zamana güncellenir

**Hatırlatıcı Formu:**
- Başlık (zorunlu)
- Açıklama (opsiyonel)
- Tarih + Saat seçici (native `<input type="datetime-local">`)
- Tekrarlama: Yok / Her Gün / Her Hafta
- Bağlı not (opsiyonel, dropdown ile seçilir)

---

## 7. TEMA SİSTEMİ

### 7.1 CSS Variables Yaklaşımı

`src/styles/globals.css` içinde `[data-theme="dark"]` ve `[data-theme="light"]` selector'larıyla tüm renkler tanımlanır:

```css
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #242424;
  --bg-tertiary: #2e2e2e;
  --surface: #333333;
  --border: #404040;
  --text-primary: #f0f0f0;
  --text-secondary: #a0a0a0;
  --text-muted: #606060;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --danger: #ef4444;
  --success: #22c55e;
  --scrollbar-thumb: #404040;
}

[data-theme="light"] {
  --bg-primary: #fafafa;
  --bg-secondary: #f0f0f0;
  --bg-tertiary: #e8e8e8;
  --surface: #ffffff;
  --border: #d4d4d4;
  --text-primary: #1a1a1a;
  --text-secondary: #525252;
  --text-muted: #a3a3a3;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --danger: #dc2626;
  --success: #16a34a;
  --scrollbar-thumb: #c4c4c4;
}
```

Tema tercihi `electron-store` (veya `app.getPath('userData')/settings.json`) dosyasında saklanır.

### 7.2 Tema Geçişi

`<html>` element'ine `data-theme` attribute set edilir. Transition animasyonu:
```css
*, *::before, *::after {
  transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
}
```

---

## 8. LAYOUT MİMARİSİ

```
┌─────────────────────────────────────────────────────────────────────┐
│  TitleBar (custom, frameless window)           [—] [□] [✕]          │
├──────────────┬───────────────────┬─────────────────────────────────┤
│              │                   │  [Toolbar: B I U H1 • ☑ 🖼]      │
│  SIDEBAR     │   NOTE LIST       ├─────────────────────────────────┤
│              │                   │                                  │
│  🔍 Ara       │  📌 Pinli Not      │  [Başlık input]                  │
│              │  ─────────────    │                                  │
│  📓 Defter 1  │  Not 1            │  [Tiptap Editor]                 │
│  📔 Defter 2  │  Not 2            │                                  │
│  📒 Defter 3  │  Not 3            │                                  │
│              │  ...              │                                  │
│  ──────────  │                   │                                  │
│  ⏰ Hatırlat. │  [+ Yeni Not]     │                   Kaydedildi ✓   │
│              │                   │                                  │
│  [+ Defter]  │                   │                                  │
└──────────────┴───────────────────┴─────────────────────────────────┘
```

**Panel genişlikleri:**
- Sidebar: 220px (sabit)
- Not listesi: 280px (sabit)
- Editör: kalan alan (flex-grow: 1)

**Pencere:**
- `frame: false` ile frameless pencere
- Özel titlebar: uygulamanın üst kısmı `-webkit-app-region: drag` ile sürüklenebilir
- Minimum boyut: 900×600px
- Başlangıç boyutu: 1280×800px

---

## 9. KURULUM VE GELİŞTİRME ADIMLARI

### 9.1 Proje İskeleti Oluşturma

```bash
# electron-vite scaffolding
npm create electron-vite@latest notepad-app -- --template react-ts
cd notepad-app
npm install

# Üretim bağımlılıkları
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image \
  @tiptap/extension-text-align @tiptap/extension-task-list \
  better-sqlite3 date-fns node-notifier uuid

# Native modül için electron rebuild
npm install --save-dev @electron/rebuild electron-builder
npx electron-rebuild
```

### 9.2 Geliştirme Sırası (Agent bu sırayı takip etmeli)

```
Adım 1: electron/main.ts           → BrowserWindow kurulumu, protokol kaydı
Adım 2: electron/preload.ts        → contextBridge API tanımları
Adım 3: electron/database/db.ts    → SQLite bağlantısı + migration runner
Adım 4: Migrationlar               → 001_initial.sql, 002_fts.sql
Adım 5: Repository'ler             → notebook.repo, note.repo, reminder.repo
Adım 6: IPC handler'ları           → her domain için ayrı dosya
Adım 7: reminder.service.ts        → scheduler + notifier
Adım 8: image.service.ts           → dosya kaydetme + protokol
Adım 9: src/types/index.ts         → TypeScript interface'leri
Adım 10: src/styles/globals.css    → CSS variables + tema
Adım 11: App.tsx + layout         → 3-panel layout, tema provider
Adım 12: Sidebar.tsx              → notebook listesi + arama
Adım 13: NoteList.tsx             → not listesi + sağ tık menu
Adım 14: Toolbar.tsx              → format butonları
Adım 15: RichEditor.tsx           → Tiptap wrapper + resim yükleme
Adım 16: EditorPane.tsx           → başlık + editor birleşimi
Adım 17: ReminderModal.tsx        → form + liste
Adım 18: ThemeToggle.tsx          → dark/light switch
Adım 19: electron-builder.config  → .exe installer konfigürasyonu
Adım 20: Test + hata düzeltme
```

---

## 10. ELECTRON BUILDER KONFİGÜRASYONU

`electron-builder.config.js`:

```javascript
module.exports = {
  appId: 'com.personal.notepad',
  productName: 'Kişisel Notlarım',
  directories: {
    output: 'dist-installer',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'assets/**/*',
    'node_modules/**/*',
    'package.json',
  ],
  extraResources: [
    { from: 'assets/images', to: 'images', filter: ['**/*'] },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'assets/icon.ico',
    requestedExecutionLevel: 'asInvoker',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Kişisel Notlarım',
    installerLanguages: ['tr_TR'],
    language: '1055',
  },
  asar: true,
  asarUnpack: ['**/better-sqlite3/**'],  // native modül asar dışında olmalı
};
```

---

## 11. KRİTİK UYARI VE KISITLAMALAR

### 11.1 Güvenlik
- `contextIsolation: true` — asla kapatma
- `nodeIntegration: false` — renderer'da Node.js doğrudan kullanılmaz
- `webSecurity: true` — yerel resimler için `appimage://` protokolü kullan, `file://` değil
- `sandbox: false` — `better-sqlite3` için gerekli; bunu belirt ama riski bil

### 11.2 Native Modüller
- `better-sqlite3` native C++ modülüdür
- Build sonrası `npx electron-rebuild` mutlaka çalıştırılmalı
- `asar: true` ile birlikte `asarUnpack` listesine ekle (yukarıda gösterildi)
- CI/CD'de `--arch=x64` parametresini açıkça ver

### 11.3 Resim Depolama
- Resimler `app.getPath('userData')/images/` altında saklanır (asar dışı)
- Dosya adı: `{uuid}.{ext}` formatı
- Maksimum resim boyutu: 20MB — aşılırsa kullanıcıya hata göster
- Desteklenen formatlar: PNG, JPG, JPEG, GIF, WEBP

### 11.4 Veritabanı
- Veritabanı dosyası: `app.getPath('userData')/notepad.db`
- Her uygulama başlangıcında `PRAGMA journal_mode=WAL;` çalıştır
- Her uygulama başlangıcında `PRAGMA foreign_keys=ON;` çalıştır
- Migration'lar sıralı ve idempotent olmalı (`CREATE TABLE IF NOT EXISTS`)

### 11.5 Hatırlatıcı Servisi
- `node-notifier` Windows 10/11 toast notification kullanır
- Uygulama kapalıyken bildirim tetiklenmez — bu kısıtlamayı kullanıcıya UI'da belirt
- Scheduler her 60 saniyede bir kontrol eder (her saniye değil — performans)

---

## 12. PERFORMANS GEREKSİNİMLERİ

- Uygulama açılış süresi: < 3 saniye (soğuk başlangıç)
- Not değiştirme gecikmesi: < 100ms
- Arama sonucu dönme süresi: < 200ms (FTS5 sayesinde mümkün)
- Editör debounce kayıt: 1500ms (kullanıcı deneyimi ile I/O dengesi)
- Maksimum test edilecek not sayısı: 10.000 not, performans kabul edilebilir olmalı

---

## 13. TEST STRATEJİSİ

Agent aşağıdaki senaryoları manuel olarak test etmelidir:

```
[ ] Notebook oluştur / yeniden adlandır / sil (cascade not silme)
[ ] Not oluştur / düzenle / sil / sabitle
[ ] Tüm toolbar formatlarını test et (B, I, U, H1, H2, liste türleri, hizalama)
[ ] Resim ekle: dosya seçici üzerinden
[ ] Resim ekle: sürükle-bırak
[ ] Resim ekle: panodan yapıştır (Ctrl+V)
[ ] Tam metin arama: başlıkta ara, içerikte ara
[ ] Hatırlatıcı oluştur → beklenen zamanda bildirim gelsin
[ ] Hatırlatıcı tekrarlama (daily) → fire_at bir sonraki güne güncellendi mi?
[ ] Dark/Light tema geçişi → tüm paneller doğru renkleniyor mu?
[ ] Uygulama kapat → yeniden aç → veriler korunuyor mu?
[ ] 100+ not ile performans testi
[ ] .exe installer ile temiz Windows makinesine kurulum
```

---

## 14. DOSYA SAKLAMA YOLLARI (userData)

```
%APPDATA%\notepad-app\
├── notepad.db          → SQLite veritabanı
├── settings.json       → tema tercihi ve diğer ayarlar
└── images\             → kullanıcı resimleri
    ├── abc123.png
    └── def456.jpg
```

`settings.json` formatı:
```json
{
  "theme": "dark",
  "lastNotebookId": "uuid-string",
  "lastNoteId": "uuid-string",
  "windowBounds": { "x": 100, "y": 100, "width": 1280, "height": 800 }
}
```

Son açık notebook ve not, bir sonraki başlangıçta restore edilmeli.

---

## 15. TAMAMLANMA KRİTERLERİ

Proje aşağıdakiler sağlandığında tamamlanmış sayılır:

- [ ] Tüm CRUD işlemleri çalışıyor (notebook, not, hatırlatıcı)
- [ ] Rich text editör tüm toolbar öğeleri ile çalışıyor
- [ ] Resim ekleme 3 yöntemle de çalışıyor
- [ ] Tam metin arama FTS5 ile çalışıyor
- [ ] Hatırlatıcı bildirimi Windows toast olarak geliyor
- [ ] Dark / Light tema geçişi çalışıyor ve tercih saklanıyor
- [ ] Veriler uygulama kapatma/açma arasında korunuyor
- [ ] `.exe` installer başarıyla üretiliyor ve temiz kurulum yapılabiliyor
- [ ] Son açık notebook/not restore ediliyor
- [ ] Tüm manuel test senaryoları geçiyor
