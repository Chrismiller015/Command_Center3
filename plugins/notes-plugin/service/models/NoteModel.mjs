// Defines the structure and basic validation for a Note in the backend service.

export class NoteModel {
    constructor(data) {
        this.id = data.id || null;
        this.content = data.content || '';
        // tags_json will be a JSON string in the DB, but an array when interacting with this model
        this.tags = Array.isArray(data.tags) ? data.tags : (typeof data.tags_json === 'string' ? JSON.parse(data.tags_json) : []);
        this.folderId = data.folderId || null;
        this.isPinned = Boolean(data.isPinned); // Ensure boolean type
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Prepares data for insertion/update in the database
    toDbFormat() {
        return {
            id: this.id,
            content: this.content,
            tags_json: JSON.stringify(this.tags), // Convert array to JSON string for DB
            folderId: this.folderId,
            isPinned: this.isPinned ? 1 : 0, // SQLite stores boolean as 0 or 1
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Static method to create an instance from a database row
    static fromDbRow(row) {
        if (!row) return null;
        return new NoteModel({
            id: row.id,
            content: row.content,
            tags_json: row.tags_json, // Pass the JSON string directly
            folderId: row.folderId,
            isPinned: row.isPinned, // SQLite 0/1 will be handled by Boolean() in constructor
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        });
    }

    // Basic validation example
    validate() {
        if (typeof this.content !== 'string') {
            throw new Error('Note content must be a string.');
        }
        if (!Array.isArray(this.tags)) {
            throw new Error('Note tags must be an array.');
        }
        // More validation rules can be added here
        return true;
    }
}