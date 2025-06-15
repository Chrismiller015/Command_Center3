// This module manages reminders associated with notes.
// It will interact with the main Electron process for system notifications.

import { ReminderModel } from '../models/ReminderModel.mjs';
import * as db from '../db.mjs';

/**
 * Adds a new reminder for a note.
 * @param {number} noteId - The ID of the associated note.
 * @param {string} targetDate - ISO string of the date/time the reminder should trigger.
 * @param {string} [message] - Optional message for the reminder.
 * @param {string} [contextRef] - Optional reference to a specific part of the note (e.g., checklist item ID).
 * @returns {Promise<object>}
 */
export async function addReminder(noteId, targetDate, message = null, contextRef = null) {
    const reminder = new ReminderModel({ noteId, targetDate, message, contextRef });
    reminder.validate();

    const sql = `INSERT INTO plugin_notes_plugin_reminders (noteId, targetDate, message, contextRef, status) VALUES (?, ?, ?, ?, ?)`;
    const result = await db.run(sql, [reminder.noteId, reminder.targetDate, reminder.message, reminder.contextRef, reminder.status]);

    // Future: Schedule system notification via Electron main process
    // window.electronAPI.scheduleNotification({
    //     id: result.lastID,
    //     title: 'Note Reminder',
    //     body: message || 'You have a note reminder!',
    //     when: new Date(targetDate).getTime()
    // });

    return result;
}

/**
 * Retrieves all reminders for a given note.
 * @param {number} noteId - The ID of the note.
 * @param {string} [status='pending'] - Filter by reminder status.
 * @returns {Promise<ReminderModel[]>}
 */
export async function getReminders(noteId, status = 'pending') {
    const sql = `SELECT * FROM plugin_notes_plugin_reminders WHERE noteId = ? AND status = ? ORDER BY targetDate ASC`;
    const rows = await db.all(sql, [noteId, status]);
    return rows.map(row => ReminderModel.fromDbRow(row));
}

/**
 * Deletes a reminder by its ID.
 * @param {number} reminderId - The ID of the reminder to delete.
 * @returns {Promise<object>}
 */
export async function deleteReminder(reminderId) {
    const sql = `DELETE FROM plugin_notes_plugin_reminders WHERE id = ?`;
    return await db.run(sql, [reminderId]);
}

/**
 * Marks a reminder as completed.
 * @param {number} reminderId - The ID of the reminder.
 * @returns {Promise<object>}
 */
export async function markReminderCompleted(reminderId) {
    const sql = `UPDATE plugin_notes_plugin_reminders SET status = 'completed' WHERE id = ?`;
    return await db.run(sql, [reminderId]);
}

// Future: A function to poll for upcoming reminders and trigger notifications
// This would likely be called from the main process service's index.mjs periodically.
export async function getUpcomingReminders(timeframeMinutes = 5) {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + timeframeMinutes * 60 * 1000);

    const sql = `SELECT r.*, n.content AS noteContent FROM plugin_notes_plugin_reminders r JOIN plugin_notes_plugin_notes n ON r.noteId = n.id WHERE r.status = 'pending' AND r.targetDate <= ? ORDER BY r.targetDate ASC`;
    const rows = await db.all(sql, [fiveMinutesFromNow.toISOString()]);
    return rows.map(row => ({
        ...ReminderModel.fromDbRow(row),
        noteTitle: row.noteContent.replace(/<[^>]+>/g, '').split('\n')[0].trim().substring(0, 40) || 'Untitled Note'
    }));
}