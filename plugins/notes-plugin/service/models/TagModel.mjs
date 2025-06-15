// Defines the structure and basic validation for a Tag in the backend service.

export class TagModel {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name || '';
    }

    toDbFormat() {
        return {
            id: this.id,
            name: this.name
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new TagModel({
            id: row.id,
            name: row.name
        });
    }

    validate() {
        if (typeof this.name !== 'string' || this.name.trim() === '') {
            throw new Error('Tag name must be a non-empty string.');
        }
        return true;
    }
}