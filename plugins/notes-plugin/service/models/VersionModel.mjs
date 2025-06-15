// Defines the structure and basic validation for a Note Version in the backend service.

export class VersionModel {
    constructor(data) {
        this.id = data.id || null;
        this.noteId = data.noteId || null;
        this.content = data.content || '';
        this.versionTimestamp = data.versionTimestamp || new Date().toISOString();
    }

    toDbFormat() {
        return {
            id: this.id,
            noteId: this.noteId,
            content: this.content,
            versionTimestamp: this.versionTimestamp
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new VersionModel({
            id: row.id,
            noteId: row.noteId,
            content: row.content,
            versionTimestamp: row.versionTimestamp
        });
    }

    validate() {
        if (typeof this.noteId !== 'number' || this.noteId <= 0) {
            throw new Error('Note ID for version must be a positive number.');
        }
        if (typeof this.content !== 'string') {
            throw new Error('Version content must be a string.');
        }
        if (typeof this.versionTimestamp !== 'string' || isNaN(new Date(this.versionTimestamp))) {
            throw new Error('Version timestamp must be a valid date string.');
        }
        return true;
    }
}