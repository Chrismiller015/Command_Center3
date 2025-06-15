const PLUGIN_ID = 'notes-plugin';

// Generic DB operations from main app
// UPDATED: Using standardized dbRunQuery, dbGetQuery, dbAllQuery
export const dbRun = async (sql, params = []) => {
    return await window.electronAPI.dbRunQuery(PLUGIN_ID, sql, params);
};

export const dbGet = async (sql, params = []) => {
    return await window.electronAPI.dbGetQuery(PLUGIN_ID, sql, params);
};

export const dbAll = async (sql, params = []) => {
    return await window.electronAPI.dbAllQuery(PLUGIN_ID, sql, params);
};

// --- Notes Plugin Specific API Calls (via service/index.mjs) ---

export const getNotes = async (options = {}) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'getNotes',
        params: options
    });
};

export const saveNote = async (noteData) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'saveNote',
        params: noteData
    });
};

export const deleteNote = async (noteId) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'deleteNote',
        params: { id: noteId }
    });
};

export const searchNotes = async (options) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'searchNotes',
        params: options
    });
};

// Versions
export const saveNoteVersion = async (noteId, content) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'saveNoteVersion',
        params: { noteId, content }
    });
};

export const getNoteVersions = async (noteId) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'getNoteVersions',
        params: { noteId }
    });
};

export const getNoteVersion = async (noteId, versionId) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'getNoteVersion',
        params: { noteId, versionId }
    });
};

export const restoreNoteVersion = async (noteId, versionId) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'restoreNoteVersion',
        params: { noteId, versionId }
    });
};

// Reminders
export const addReminder = async (noteId, targetDate, message, contextRef) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'addReminder',
        params: { noteId, targetDate, message, contextRef }
    });
};

export const getReminders = async (noteId, status = 'pending') => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'getReminders',
        params: { noteId, status }
    });
};

export const deleteReminder = async (reminderId) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'deleteReminder',
        params: { reminderId }
    });
};

// Templates
export const getTemplates = async () => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'getTemplates',
        params: {}
    });
};

export const saveNoteAsTemplate = async (templateName, content) => {
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'saveNoteAsTemplate',
        params: { templateName, content }
    });
};

export const getTemplate = async (templateId) => { // Using templateId as key
    return await window.electronAPI['plugin:service-call']({
        pluginId: PLUGIN_ID,
        method: 'getTemplate',
        params: { templateId }
    });
};


// Clipboard API for 'Copy for X' (this calls a new main process method)
export const writeToClipboard = async (format, data) => {
    return await window.electronAPI.writeToClipboard({ format, data });
};

// Add more API calls here as features require them (e.g., tags, folders, linking)