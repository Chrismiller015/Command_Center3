import { createNoteItem } from './NotesItem.js';

/**
 * Renders the list of notes in the sidebar.
 * @param {HTMLElement} container - The container element to render the list into.
 * @param {Array<object>} notes - The array of note objects to render.
 * @param {function} onNoteSelect - The callback function to execute when a note is selected.
 */
export function renderNotesList(container, notes, onNoteSelect) {
  if (!container) {
    console.error('Notes list container not found.');
    return;
  }

  // Clear the existing list
  container.innerHTML = '';

  if (!notes || notes.length === 0) {
    container.innerHTML = '<p class="text-gray-400 p-4">No notes found.</p>';
    return;
  }

  const listElement = document.createElement('ul');
  notes.forEach(note => {
    const noteElement = createNoteItem(note, onNoteSelect);
    listElement.appendChild(noteElement);
  });

  container.appendChild(listElement);
}