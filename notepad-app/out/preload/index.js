"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  // Notebook
  getNotebooks: () => electron.ipcRenderer.invoke("notebook:getAll"),
  createNotebook: (data) => electron.ipcRenderer.invoke("notebook:create", data),
  updateNotebook: (id, data) => electron.ipcRenderer.invoke("notebook:update", id, data),
  deleteNotebook: (id) => electron.ipcRenderer.invoke("notebook:delete", id),
  // Note
  getNotes: (notebookId) => electron.ipcRenderer.invoke("note:getByNotebook", notebookId),
  getNoteById: (id) => electron.ipcRenderer.invoke("note:getById", id),
  createNote: (data) => electron.ipcRenderer.invoke("note:create", data),
  updateNote: (id, data) => electron.ipcRenderer.invoke("note:update", id, data),
  deleteNote: (id) => electron.ipcRenderer.invoke("note:delete", id),
  searchNotes: (query) => electron.ipcRenderer.invoke("note:search", query),
  pinNote: (id, pinned) => electron.ipcRenderer.invoke("note:pin", id, pinned),
  // Image
  saveImage: (noteId, buffer, mimeType) => electron.ipcRenderer.invoke("image:save", noteId, buffer, mimeType),
  getImagePath: (filename) => electron.ipcRenderer.invoke("image:getPath", filename),
  openImageDialog: () => electron.ipcRenderer.invoke("image:openDialog"),
  // Reminder
  getReminders: () => electron.ipcRenderer.invoke("reminder:getAll"),
  createReminder: (data) => electron.ipcRenderer.invoke("reminder:create", data),
  updateReminder: (id, data) => electron.ipcRenderer.invoke("reminder:update", id, data),
  deleteReminder: (id) => electron.ipcRenderer.invoke("reminder:delete", id),
  markReminderDone: (id) => electron.ipcRenderer.invoke("reminder:markDone", id),
  // Theme / Settings
  getTheme: () => electron.ipcRenderer.invoke("app:getTheme"),
  setTheme: (theme) => electron.ipcRenderer.invoke("app:setTheme", theme),
  getSettings: () => electron.ipcRenderer.invoke("app:getSettings"),
  saveSettings: (data) => electron.ipcRenderer.invoke("app:saveSettings", data),
  // Window controls
  minimizeWindow: () => electron.ipcRenderer.invoke("window:minimize"),
  maximizeWindow: () => electron.ipcRenderer.invoke("window:maximize"),
  closeWindow: () => electron.ipcRenderer.invoke("window:close"),
  // Events (main → renderer)
  onReminderFired: (cb) => {
    electron.ipcRenderer.on("reminder:fired", (_event, data) => cb(data));
  },
  offReminderFired: () => {
    electron.ipcRenderer.removeAllListeners("reminder:fired");
  }
});
