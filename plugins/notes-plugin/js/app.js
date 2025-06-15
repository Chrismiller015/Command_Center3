import * as API from './api.js'; // Import our API calls
import { QuillService } from './services/QuillService.js'; // Import Quill service
import { formatDate } from './utils.js'; // Import utility functions

// --- CONFIGURATION ---
const PLUGIN_ID = 'notes-plugin';
const SAFE_PLUGIN_ID = PLUGIN_ID.replace(/-/g, '_');
const NOTES_TABLE = `plugin_${SAFE_PLUGIN_ID}_notes`; // This will likely become more complex with folders/tags

// --- UI ELEMENTS ---
const searchBar = document.getElementById('search-bar');
const notesListEl = document.getElementById('notes-list');
const newNoteBtn = document.getElementById('new-note-btn');
const placeholderNewNoteLink = document.getElementById('placeholder-new-note');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const tagsInput = document.getElementById('tags-input');
const editorArea = document.getElementById('editor-area');
const placeholderArea = document.getElementById('placeholder-area');

// --- STATE ---
let allNotes = [];
let activeNoteId = null;
let saveTimeout;

// --- QUILL EDITOR SETUP ---
const quillService = new QuillService('#editor');

// --- CORE FUNCTIONS ---

/** Renders the list of notes on the left panel. */
const renderNotesList = (notesToRender) => {
    notesListEl.innerHTML = '';
    if (notesToRender.length === 0) {
        notesListEl.innerHTML = '<p class="text-center text-gray-500 p-4">No notes found.</p>';
        return;
    }
    notesToRender.forEach(note => {
        const firstLine = note.content.replace(/<[^>]+>/g, '').split('\\n')[0].trim();
        const title = firstLine.substring(0, 40) || 'New Note';
        const item = document.createElement('div');
        item.className = `note-item p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-700 ${note.id === activeNoteId ? 'active' : ''}`;
        item.dataset.id = note.id;
        item.innerHTML = `
            <h3 class="font-bold truncate">${title}</h3>
            <p class="text-sm text-gray-400">Updated: ${formatDate(note.updatedAt)}</p>
            <p class="text-sm text-indigo-400 truncate mt-1">${note.tags.split(',').join(' ')}</p>
        `;
        item.addEventListener('click', () => displayNote(note.id));
        notesListEl.appendChild(item);
    });
};

/** Fetches all notes from the database and renders them. */
const loadNotes = async () => {
    try {
        const query = `SELECT * FROM ${NOTES_TABLE} ORDER BY updatedAt DESC`;
        allNotes = await API.dbAll(query); // Use API service
        renderNotesList(allNotes);
    } catch (err) {
        console.error("Failed to load notes:", err);
        notesListEl.innerHTML = `<p class="text-red-400 p-4">Error: Could not load notes from database.</p>`;
    }
};

/** Displays a selected note in the editor. */
const displayNote = (id) => {
    activeNoteId = id;
    const note = allNotes.find(n => n.id === id);
    if (note) {
        quillService.setHTML(note.content);
        tagsInput.value = note.tags;
        editorArea.classList.remove('hidden');
        placeholderArea.classList.add('hidden');
        quillService.focus();
        renderNotesList(allNotes); // Re-render to highlight active
    }
    renderNotesList(allNotes); // Update active highlighting
};

/** Handles creating or updating a note. */
const saveNote = async () => {
    const content = quillService.getHTML();
    const tags = tagsInput.value.trim();
    const now = new Date().toISOString();

    try {
        if (activeNoteId) { // Update existing note
            const sql = `UPDATE ${NOTES_TABLE} SET content = ?, tags = ?, updatedAt = ? WHERE id = ?`;
            await API.dbRun(sql, [content, tags, now, activeNoteId]); // Use API service
        } else { // Create new note
            const sql = `INSERT INTO ${NOTES_TABLE} (content, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?)`;
            const result = await API.dbRun(sql, [content, tags, now, now]); // Use API service
            activeNoteId = result.lastID; // Set the new ID as active
        }
        await loadNotes(); // Reload to show changes
        displayNote(activeNoteId); // Ensure the new note stays displayed
    } catch (err) {
        console.error("Save failed:", err);
    }
};

/** Handles the logic for creating a new note. */
const createNewNote = () => {
    activeNoteId = null;
    quillService.setHTML('');
    tagsInput.value = '';
    editorArea.classList.remove('hidden');
    placeholderArea.classList.add('hidden');
    quillService.focus();
    renderNotesList(allNotes); // Un-highlight any previously active notes
};

/** Handles deleting the currently active note. */
const deleteCurrentNote = async () => {
    if (!activeNoteId) return;

    if (confirm('Are you sure you want to delete this note permanently?')) {
        try {
            const sql = `DELETE FROM ${NOTES_TABLE} WHERE id = ?`;
            await API.dbRun(sql, [activeNoteId]); // Use API service
            activeNoteId = null;
            editorArea.classList.add('hidden');
            placeholderArea.classList.remove('hidden');
            await loadNotes();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    }
};

/** Filters notes based on the search input. */
const searchNotes = () => {
    const term = searchBar.value.toLowerCase();
    if (!term) {
        renderNotesList(allNotes);
        return;
    }
    const filteredNotes = allNotes.filter(note => {
        const contentText = note.content.replace(/<[^>]+>/g, '').toLowerCase();
        const tagsText = note.tags.toLowerCase();
        return contentText.includes(term) || tagsText.includes(term);
    });
    renderNotesList(filteredNotes);
};

// --- EVENT LISTENERS ---

// Auto-save on text change in editor or tags
quillService.onTextChange(() => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
});
tagsInput.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
});

// Button clicks
newNoteBtn.addEventListener('click', createNewNote);
placeholderNewNoteLink.addEventListener('click', (e) => {
    e.preventDefault();
    createNewNote();
});
deleteNoteBtn.addEventListener('click', deleteCurrentNote);

// Search
searchBar.addEventListener('input', searchNotes);

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', loadNotes);

// Expose functions if needed for debugging via console
window.notesApp = {
    loadNotes,
    displayNote,
    saveNote,
    createNewNote,
    deleteCurrentNote,
    searchNotes,
    quill: quillService.quillInstance // For direct Quill access if needed for debugging
};