// This file contains database operations specifically for the Notes plugin.
// It uses the generic database functions exposed by the main Electron process.

const PLUGIN_ID = 'notes-plugin'; // Matches the ID in manifest.json

// Function to run a generic SQL query (INSERT, UPDATE, DELETE, CREATE)
// UPDATED: Using standardized dbRunQuery
async function run(sql, params = []) {
    try {
        return await window.electronAPI.dbRunQuery(PLUGIN_ID, sql, params);
    } catch (error) {
        console.error(`[Notes DB] Error running SQL: ${sql}`, error);
        throw error;
    }
}

// Function to get a single row
// UPDATED: Using standardized dbGetQuery
async function get(sql, params = []) {
    try {
        return await window.electronAPI.dbGetQuery(PLUGIN_ID, sql, params);
    } catch (error) {
        console.error(`[Notes DB] Error getting single row: ${sql}`, error);
        throw error;
    }
}

// Function to get all rows
// UPDATED: Using standardized dbAllQuery
async function all(sql, params = []) {
    try {
        return await window.electronAPI.dbAllQuery(PLUGIN_ID, sql, params);
    } catch (error) {
        console.error(`[Notes DB] Error getting all rows: ${sql}`, error);
        throw error;
    }
}

// --- Specific Notes Plugin Database Operations ---

// Saves a note (insert or update)
export async function saveNote(noteData) {
    const { id, content, tags_json, folderId, isPinned, createdAt, updatedAt } = noteData;
    if (id) {
        const sql = `UPDATE plugin_notes_plugin_notes SET content = ?, tags_json = ?, folderId = ?, isPinned = ?, updatedAt = ? WHERE id = ?`;
        return await run(sql, [content, tags_json, folderId, isPinned, updatedAt, id]);
    } else {
        const sql = `INSERT INTO plugin_notes_plugin_notes (content, tags_json, folderId, isPinned, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`;
        return await run(sql, [content, tags_json, folderId, isPinned, createdAt, updatedAt]);
    }
}

// Gets a single note by ID
export async function getNote(id) {
    const sql = `SELECT * FROM plugin_notes_plugin_notes WHERE id = ?`;
    return await get(sql, [id]);
}

// Gets all notes (can be filtered/ordered later)
export async function getNotes(options = {}) {
    let sql = `SELECT * FROM plugin_notes_plugin_notes`;
    const params = [];

    // Add basic ordering for now; advanced filtering will be in features/search.mjs
    sql += ` ORDER BY updatedAt DESC`;
    return await all(sql, params);
}

// Deletes a note by ID
export async function deleteNote(id) {
    const sql = `DELETE FROM plugin_notes_plugin_notes WHERE id = ?`;
    return await run(sql, [id]);
}

// --- Folder Operations ---
export async function getFolders() {
    return await all(`SELECT * FROM plugin_notes_plugin_folders ORDER BY name`);
}

export async function createFolder(name, parentId = null) {
    const sql = `INSERT INTO plugin_notes_plugin_folders (name, parentId) VALUES (?, ?)`;
    return await run(sql, [name, parentId]);
}

// Export generic functions for feature modules to use
export { run, get, all };