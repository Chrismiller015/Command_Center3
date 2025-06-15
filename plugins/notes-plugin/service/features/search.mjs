// This module provides advanced search capabilities for notes.

import { NoteModel } from '../models/NoteModel.mjs';
import * as db from '../db.mjs'; // Use plugin-specific db access

/**
 * Performs a search on notes with advanced filtering and query capabilities.
 * @param {object} options - Search options.
 * @param {string} options.term - The main search term.
 * @param {string} [options.folderId] - Filter by folder.
 * @param {boolean} [options.isPinned] - Filter by pinned status.
 * @param {string[]} [options.tags] - Filter by specific tags.
 * @param {string} [options.query] - Advanced query string (e.g., "NOT contains 'blah' AND contains 'plem'").
 * @returns {Promise<NoteModel[]>}
 */
export async function searchNotes(options) {
    let sql = `SELECT * FROM plugin_notes_plugin_notes WHERE 1=1`;
    const params = [];

    const searchTerm = options.term ? options.term.toLowerCase() : '';
    if (searchTerm) {
        // Basic full-text search across content and tags_json
        sql += ` AND (LOWER(content) LIKE ? OR LOWER(tags_json) LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (options.folderId) {
        sql += ` AND folderId = ?`;
        params.push(options.folderId);
    }

    if (options.isPinned !== undefined) {
        sql += ` AND isPinned = ?`;
        params.push(options.isPinned ? 1 : 0);
    }

    if (options.tags && options.tags.length > 0) {
        // This is a simplified tag search. For true nested tags or many-to-many,
        // it would involve JOINs with the note_tags table.
        // For now, it checks if the JSON string contains the tag.
        options.tags.forEach(tag => {
            sql += ` AND LOWER(tags_json) LIKE ?`;
            params.push(`%\"${tag.toLowerCase()}\"%`); // Search for tag inside JSON array string
        });
    }

    // --- Advanced Query Parsing (Placeholder - complex implementation) ---
    // This will involve parsing the 'options.query' string for operators like AND, OR, NOT,
    // and specific field filters. This is a significant undertaking.
    if (options.query) {
        console.warn('Advanced query parsing is complex and a placeholder.');
        // Example: rudimentary "NOT"
        if (options.query.toLowerCase().includes('not contains')) {
            const excludeTerm = options.query.toLowerCase().split('not contains')[1].trim().replace(/['"]/g, '');
            sql += ` AND LOWER(content) NOT LIKE ?`;
            params.push(`%${excludeTerm}%`);
        }
    }

    sql += ` ORDER BY updatedAt DESC`;

    try {
        const rows = await db.all(sql, params);
        return rows.map(row => NoteModel.fromDbRow(row));
    } catch (error) {
        console.error('[Search Feature] Failed to perform search:', error);
        throw error;
    }
}