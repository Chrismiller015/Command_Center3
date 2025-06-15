// Defines the structure and basic validation for a Reminder in the backend service.

export class ReminderModel {
    constructor(data) {
        this.id = data.id || null;
        this.noteId = data.noteId || null;
        this.targetDate = data.targetDate || new Date().toISOString();
        this.status = data.status || 'pending'; // 'pending', 'completed', 'dismissed'
        this.message = data.message || null;
        this.contextRef = data.contextRef || null; // e.g., ID of a checklist item
    }

    toDbFormat() {
        return {
            id: this.id,
            noteId: this.noteId,
            targetDate: this.targetDate,
            status: this.status,
            message: this.message,
            contextRef: this.contextRef
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new ReminderModel({
            id: row.id,
            noteId: row.noteId,
            targetDate: row.targetDate,
            status: row.status,
            message: row.message,
            contextRef: row.contextRef
        });
    }

    validate() {
        if (typeof this.noteId !== 'number' || this.noteId <= 0) {
            throw new Error('Note ID for reminder must be a positive number.');
        }
        if (typeof this.targetDate !== 'string' || isNaN(new Date(this.targetDate))) {
            throw new Error('Reminder targetDate must be a valid date string.');
        }
        if (!['pending', 'completed', 'dismissed'].includes(this.status)) {
            throw new Error('Reminder status is invalid.');
        }
        if (this.message !== null && typeof this.message !== 'string') {
            throw new Error('Reminder message must be a string or null.');
        }
        return true;
    }
}