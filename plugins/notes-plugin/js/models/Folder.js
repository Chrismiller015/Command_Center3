export class Tag {
    constructor({ id = null, name = '' }) {
        this.id = id;
        this.name = name;
    }

    toDbFormat() {
        return {
            id: this.id,
            name: this.name
        };
    }

    static fromDbRow(row) {
        if (!row) return null;
        return new Tag({
            id: row.id,
            name: row.name
        });
    }
}