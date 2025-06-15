/**
 * Creates and returns a single note item element.
 * @param {object} note - The note object.
 * @param {function} onNoteSelect - The callback to call when the item is clicked.
 * @returns {HTMLLIElement} The created list item element.
 */
export function createNoteItem(note, onNoteSelect) {
  const listItem = document.createElement('li');
  listItem.className = 'p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700';
  listItem.dataset.noteId = note.id;

  listItem.addEventListener('click', () => {
    onNoteSelect(note.id);
  });

  const title = document.createElement('h3');
  title.className = 'font-bold text-white truncate';
  title.textContent = note.title || 'Untitled Note';

  const preview = document.createElement('p');
  preview.className = 'text-gray-400 text-sm truncate';
  // A simple text preview from the content
  try {
    const content = JSON.parse(note.content);
    const textPreview = content.ops.map(op => typeof op.insert === 'string' ? op.insert : '').join('').substring(0, 100);
    preview.textContent = textPreview || 'No additional text';
  } catch (e) {
    preview.textContent = 'No additional text';
  }

  const date = document.createElement('p');
  date.className = 'text-gray-500 text-xs mt-1';
  date.textContent = new Date(note.updated_at).toLocaleString();
  
  listItem.appendChild(title);
  listItem.appendChild(preview);
  listItem.appendChild(date);

  return listItem;
}