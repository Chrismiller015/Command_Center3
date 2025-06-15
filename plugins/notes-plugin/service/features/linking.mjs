// This module handles bi-directional linking between notes.

import { LinkModel } from '../models/LinkModel.mjs';
import * as db from '../db.mjs';

/**
 * Creates a new link between two notes.
 * Bi-directional implies that if A links to B, B is also implicitly linked to A.
 * @param {number} sourceNoteId
 * @param {number} targetNoteId
 * @param {string} [linkType='bi-directional']
 * @returns {Promise<object>}
 */
export async function createLink(sourceNoteId, targetNoteId, linkType = 'bi-directional') {
    const link = new LinkModel({ sourceNoteId, targetNoteId, linkType });
    link.validate();

    const sql = `INSERT OR IGNORE INTO plugin_notes_plugin_note_links (sourceNoteId, targetNoteId, linkType) VALUES (?, ?, ?)`;
    return await db.run(sql, [link.sourceNoteId, link.targetNoteId, link.linkType]);
}

/**
 * Removes a link between two notes.
 * @param {number} sourceNoteId
 * @param {number} targetNoteId
 * @returns {Promise<object>}
 */
export async function removeLink(sourceNoteId, targetNoteId) {
    const sql = `DELETE FROM plugin_notes_plugin_note_links WHERE sourceNoteId = ? AND targetNoteId = ?`;
    return await db.run(sql, [sourceNoteId, targetNoteId]);
}

/**
 * Gets all notes linked FROM a given note (outgoing links).
 * @param {number} noteId
 * @returns {Promise<Array<object>>} - Array of linked note IDs and their titles.
 */
export async function getOutgoingLinks(noteId) {
    const sql = `
        SELECT l.targetNoteId AS id, n.content
        FROM plugin_notes_plugin_note_links l
        JOIN plugin_notes_plugin_notes n ON l.targetNoteId = n.id
        WHERE l.sourceNoteId = ?;
    `;
    const rows = await db.all(sql, [noteId]);
    return rows.map(row => ({
        id: row.id,
        title: row.content.replace(/<[^>]+>/g, '').split('\n')[0].trim().substring(0, 40) || 'Untitled'
    }));
}

/**
 * Gets all notes linked TO a given note (incoming links/backlinks).
 * @param {number} noteId
 * @returns {Promise<Array<object>>} - Array of linked note IDs and their titles.
 */
export async function getIncomingLinks(noteId) {
    const sql = `
        SELECT l.sourceNoteId AS id, n.content
        FROM plugin_notes_plugin_note_links l
        JOIN plugin_notes_plugin_notes n ON l.sourceNoteId = n.id
        WHERE l.targetNoteId = ?;
    `;
    const rows = await db.all(sql, [noteId]);
    return rows.map(row => ({
        id: row.id,
        title: row.content.replace(/<[^>]+>/g, '').split('\n')[0].trim().substring(0, 40) || 'Untitled'
    }));
}