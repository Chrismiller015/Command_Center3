export class Note {
    constructor({ id = null, content = '', tags_json = '[]', folderId = null, isPinned = false, createdAt = new Date().toISOString(), updatedAt = new Date().toISOString() }) {
        this.id = id;
        this.content = content;
        this.tags = JSON.parse(tags_json); // Store as array on frontend
        this.folderId = folderId;
        this.isPinned = isPinned;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toDbFormat() {
        return {
            id: this.id,
            content: this.content,
            tags_json: JSON.stringify(this.tags), // Store as JSON string in DB
            folderId: this.folderId,
            isPinned: this.isPinned ? 1 : 0, // SQLite stores booleans as 0 or 1
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new Note({
            id: row.id,
            content: row.content,
            tags_json: row.tags_json || '[]', // Ensure it's a valid JSON string
            folderId: row.folderId,
            isPinned: !!row.isPinned, // Convert 0/1 to boolean
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        });
    }
}