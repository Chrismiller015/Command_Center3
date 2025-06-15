export class Link {
    constructor({ sourceNoteId, targetNoteId, linkType = 'bi-directional' }) {
        this.sourceNoteId = sourceNoteId;
        this.targetNoteId = targetNoteId;
        this.linkType = linkType;
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
        return new Link({
            sourceNoteId: row.sourceNoteId,
            targetNoteId: row.targetNoteId,
            linkType: row.linkType
        });
    }
}