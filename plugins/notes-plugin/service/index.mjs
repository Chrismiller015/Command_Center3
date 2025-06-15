// plugins/notes-plugin/service/index.mjs

// FIX: Import all exported functions from db.mjs into a single 'db' object
import * as db from './db.mjs';
import * as featureManager from './features/index.mjs';

/**
 * Main service object for the Notes plugin.
 * These methods are exposed to the frontend via the main process IPC bridge.
 */
const noteService = {
  // CRUD operations for Notes
  getNote: (params) => featureManager.versions.getCurrentNote(params.id),
  getNotes: (params) => db.getAllNotes(params),
  createNote: (params) => db.createNote(params),
  updateNote: (params) => db.updateNote(params),
  deleteNote: (params) => db.deleteNote(params.id),

  // Version history
  getNoteVersions: (params) => featureManager.versions.getNoteVersions(params.id),
  getNoteVersion: (params) => featureManager.versions.getNoteVersion(params.versionId),
  revertToVersion: (params) => featureManager.versions.revertToVersion(params.versionId),
  compareVersions: (params) => featureManager.versions.compareVersions(params.versionIdA, params.versionIdB),

  // Tag operations
  getTags: (params) => db.getAllTags(params),
  addTagToNote: (params) => db.addTagToNote(params),
  removeTagFromNote: (params) => db.removeTagFromNote(params),

  // Folder operations
  getFolders: () => db.getAllFolders(),
  createFolder: (params) => db.createFolder(params.name),
  renameFolder: (params) => db.updateFolder(params),
  deleteFolder: (params) => db.deleteFolder(params.id),

  // Linking
  createLink: (params) => featureManager.linking.createLink(params),
  getBacklinks: (params) => featureManager.linking.getBacklinks(params.noteId),

  // Reminders
  setReminder: (params) => featureManager.reminders.setReminder(params),
  getReminders: () => featureManager.reminders.getReminders(),
  deleteReminder: (params) => featureManager.reminders.deleteReminder(params.reminderId),

  // Search
  searchNotes: (params) => featureManager.search.searchNotes(params.query),

  // Templates
  getTemplates: () => featureManager.templates.getTemplates(),
  createTemplate: (params) => featureManager.templates.createTemplate(params.name, params.content),
  applyTemplate: (params) => featureManager.templates.applyTemplate(params.templateId),
};

export default noteService;