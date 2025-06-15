import { CopyDropdown } from './CopyDropdown.js'; // Will be created next

export class NoteActions {
    constructor(containerId, onDeleteNote, onCopyNote) {
        this.container = document.getElementById(containerId);
        this.onDeleteNote = onDeleteNote;
        this.onCopyNote = onCopyNote;

        this.deleteBtn = this.container.querySelector('#delete-note-btn');
        // We will dynamically add the CopyDropdown container later in render()

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', this.onDeleteNote);
        }
        // CopyDropdown event listeners will be set up by CopyDropdown class
    }

    render(noteIsActive) {
        if (noteIsActive) {
            this.container.classList.remove('hidden');
        } else {
            this.container.classList.add('hidden');
        }

        // Initialize CopyDropdown here. We need a container for it in index.html
        // For now, let's just make sure the delete button is visible/hidden correctly.
    }
}