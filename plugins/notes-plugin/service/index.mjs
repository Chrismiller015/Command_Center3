// This file acts as the main entry point for the plugin's
// backend service, exposing methods to the frontend via Electron's IPC.

import db from './db.mjs';
import * as features from './features/index.mjs'; // Will create this aggregate index file

// Define the API methods that the renderer process (frontend) can call.
// Each method here should typically delegate to the appropriate
// database function or feature-specific module.
const api = {
    // Basic DB operations (will wrap the main app's database.js functions)
    async dbRun(sql, params) {
        return await db.run(sql, params);
    },
    async dbGet(sql, params) {
        return await db.get(sql, params);
    },
    async dbAll(sql, params) {
        return await db.all(sql, params);
    },

    // --- Feature-specific API calls ---
    // Example: Notes operations
    async getNotes(options = {}) {
        return await db.getNotes(options);
    },
    async saveNote(noteData) {
        return await db.saveNote(noteData);
    },
    async deleteNote(noteId) {
        return await db.deleteNote(noteId);
    },

    // Example: Folder operations
    async getFolders() {
        return await db.getFolders();
    },
    async createFolder(name, parentId = null) {
        return await db.createFolder(name, parentId);
    },

    // Example: Version history
    async getNoteVersions(noteId) {
        return await features.versions.getVersions(noteId);
    },
    async restoreNoteVersion(noteId, versionId) {
        return await features.versions.restoreVersion(noteId, versionId);
    },

    // Example: Reminders
    async addReminder(noteId, targetDate, message, contextRef = null) {
        return await features.reminders.addReminder(noteId, targetDate, message, contextRef);
    },
    async deleteReminder(reminderId) {
        return await features.reminders.deleteReminder(reminderId);
    },

    // Example: Templates
    async getTemplates() {
        return await features.templates.getTemplates();
    },
    async saveNoteAsTemplate(noteId, templateName) {
        return await features.templates.saveNoteAsTemplate(noteId, templateName);
    },

    // Add API for Copy for X feature (this will be complex)
    // This will receive the formatted content from the frontend and interact with Electron's clipboard
    async writeToClipboard(format, data) {
        // This will call Electron's clipboard API (requires main process access)
        // window.electronAPI.writeToClipboard is what the frontend will call.
        // This `index.mjs` will expose `writeToClipboard` which in turn calls
        // a new handler in `src/main/index.js`
        console.log(`Backend service received request to write to clipboard for format: ${format}`);
        // For now, this is a placeholder. The actual clipboard interaction
        // will be in src/main/index.js via an exposed electronAPI method.
        return true;
    }

    // Add other feature-specific APIs as they are implemented
};

// IMPORTANT: This 'api' object needs to be returned/exposed in a way that
// src/main/index.js can pick it up and register its methods via ipcMain.handle.
// For now, we'll assume it's directly exported.
export default api;