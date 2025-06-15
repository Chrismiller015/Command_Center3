// Defines the structure and basic validation for a Folder in the backend service.

export class FolderModel {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.parentId = data.parentId || null;
    }

    toDbFormat() {
        return {
            id: this.id,
            name: this.name,
            parentId: this.parentId
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new FolderModel({
            id: row.id,
            name: row.name,
            parentId: row.parentId
        });
    }

    validate() {
        if (typeof this.name !== 'string' || this.name.trim() === '') {
            throw new Error('Folder name must be a non-empty string.');
        }
        if (this.parentId !== null && typeof this.parentId !== 'number') {
            throw new Error('Folder parentId must be a number or null.');
        }
        return true;
    }
}