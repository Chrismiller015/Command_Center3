// This module manages note version history.

import { VersionModel } from '../models/VersionModel.mjs';
import { NoteModel } from '../models/NoteModel.mjs';
import * as db from '../db.mjs'; // Use plugin-specific db access

/**
 * Saves a new version of a note.
 * Called when a note is saved or after significant changes.
 * @param {number} noteId - The ID of the note.
 * @param {string} content - The full content of the note at this version.
 * @returns {Promise<object>} - Result of the database operation.
 */
export async function saveVersion(noteId, content) {
    const versionTimestamp = new Date().toISOString();
    const version = new VersionModel({ noteId, content, versionTimestamp });
    version.validate();

    const sql = `INSERT INTO plugin_notes_plugin_note_versions (noteId, content, versionTimestamp) VALUES (?, ?, ?)`;
    return await db.run(sql, [version.noteId, version.content, version.versionTimestamp]);
}

/**
 * Retrieves all versions for a given note.
 * @param {number} noteId - The ID of the note.
 * @returns {Promise<VersionModel[]>} - Array of note versions, ordered by timestamp.
 */
export async function getVersions(noteId) {
    const sql = `SELECT * FROM plugin_notes_plugin_note_versions WHERE noteId = ? ORDER BY versionTimestamp DESC`;
    const rows = await db.all(sql, [noteId]);
    return rows.map(row => VersionModel.fromDbRow(row));
}

/**
 * Restores a note to a specific version.
 * This effectively updates the main note's content.
 * @param {number} noteId - The ID of the note to restore.
 * @param {number} versionId - The ID of the version to restore from.
 * @returns {Promise<object>} - Result of the note update operation.
 */
export async function restoreVersion(noteId, versionId) {
    const versionSql = `SELECT content FROM plugin_notes_plugin_note_versions WHERE id = ? AND noteId = ?`;
    const versionRow = await db.get(versionSql, [versionId, noteId]);

    if (!versionRow) {
        throw new Error(`Version ${versionId} not found for note ${noteId}.`);
    }

    const newContent = versionRow.content;
    const updatedAt = new Date().toISOString();

    const updateNoteSql = `UPDATE plugin_notes_plugin_notes SET content = ?, updatedAt = ? WHERE id = ?`;
    return await db.run(updateNoteSql, [newContent, updatedAt, noteId]);
}

/**
 * Deletes old versions of notes to manage storage (optional cleanup).
 * @param {number} noteId - The ID of the note.
 * @param {number} keepCount - Number of most recent versions to keep.
 */
export async function cleanOldVersions(noteId, keepCount = 10) {
    // Get version IDs to keep
    const keepSql = `SELECT id FROM plugin_notes_plugin_note_versions WHERE noteId = ? ORDER BY versionTimestamp DESC LIMIT ?`;
    const keepRows = await db.all(keepSql, [noteId, keepCount]);
    const keepIds = keepRows.map(row => row.id);

    if (keepIds.length > 0) {
        // Delete all versions not in the 'keep' list
        const deleteSql = `DELETE FROM plugin_notes_plugin_note_versions WHERE noteId = ? AND id NOT IN (${keepIds.join(',')})`;
        return await db.run(deleteSql, [noteId]);
    }
    return null;
}