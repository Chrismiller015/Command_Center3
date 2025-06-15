// Defines the structure and basic validation for a Link in the backend service.

export class LinkModel {
    constructor(data) {
        this.sourceNoteId = data.sourceNoteId || null;
        this.targetNoteId = data.targetNoteId || null;
        this.linkType = data.linkType || 'bi-directional';
    }

    toDbFormat() {
        return {
            sourceNoteId: this.sourceNoteId,
            targetNoteId: this.targetNoteId,
            linkType: this.linkType
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new LinkModel({
            sourceNoteId: row.sourceNoteId,
            targetNoteId: row.targetNoteId,
            linkType: row.linkType
        });
    }

    validate() {
        if (typeof this.sourceNoteId !== 'number' || typeof this.targetNoteId !== 'number') {
            throw new Error('Source and target note IDs must be numbers.');
        }
        if (this.sourceNoteId <= 0 || this.targetNoteId <= 0) {
            throw new Error('Source and target note IDs must be positive.');
        }
        if (typeof this.linkType !== 'string' || this.linkType.trim() === '') {
            throw new Error('Link type must be a non-empty string.');
        }
        return true;
    }
}