import { NoteItem } from './NoteItem.js';

export class NotesList {
    constructor(containerId, onNoteSelect) {
        this.container = document.getElementById(containerId);
        this.onNoteSelect = onNoteSelect;
        this.notes = [];
        this.activeNoteId = null;
    }

    render(notes, activeNoteId) {
        this.notes = notes;
        this.activeNoteId = activeNoteId;
        this.container.innerHTML = ''; // Clear existing list

        if (this.notes.length === 0) {
            this.container.innerHTML = '<p class="text-center text-gray-500 p-4">No notes found.</p>';
            return;
        }

        // Future enhancement: Group by folders, show pinned notes first
        this.notes.forEach(note => {
            const noteItem = new NoteItem(note, note.id === this.activeNoteId);
            const itemElement = noteItem.render();
            itemElement.addEventListener('click', () => this.onNoteSelect(note.id));
            this.container.appendChild(itemElement);
        });
    }
}