/**
 * Sets up the main action buttons for the notes plugin (e.g., New Note, Delete Note).
 * @param {object} options - An object containing the callback handlers.
 * @param {function} options.onNewNote - Callback for when the 'New Note' button is clicked.
 * @param {function} options.onDeleteNote - Callback for when the 'Delete Note' button is clicked.
 */
// FIX: Ensure this is the primary exported function for button setup.
export function setupActionButtons({ onNewNote, onDeleteNote }) {
    const newNoteBtn = document.getElementById('new-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');

    if (newNoteBtn) {
        newNoteBtn.addEventListener('click', onNewNote);
    } else {
        console.error('New Note button not found');
    }

    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', onDeleteNote);
    } else {
        console.error('Delete Note button not found');
    }
}