import { formatDate } from '../utils.js';

export class NoteItem {
    constructor(note, isActive = false) {
        this.note = note;
        this.isActive = isActive;
    }

    render() {
        const item = document.createElement('div');
        item.className = `note-item p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-700 ${this.isActive ? 'active' : ''}`;
        item.dataset.id = this.note.id;

        const firstLine = this.note.content.replace(/<[^>]+>/g, '').split('\n')[0].trim();
        const title = firstLine.substring(0, 40) || 'New Note';
        const tagsText = this.note.tags.join(' '); // Assuming tags is now an array

        item.innerHTML = `
            <h3 class="font-bold truncate">${title}</h3>
            <p class="text-sm text-gray-400">Updated: ${formatDate(this.note.updatedAt)}</p>
            <p class="text-sm text-indigo-400 truncate mt-1">${tagsText}</p>
        `;
        return item;
    }
}