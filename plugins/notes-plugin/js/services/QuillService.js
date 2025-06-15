/**
 * Initializes and configures the Quill rich text editor.
 * @param {string} selector - The CSS selector for the editor container.
 * @returns {Quill} The initialized Quill instance.
 */
// FIX: Added the 'export' keyword to make this function available for import.
export function initializeQuill(selector) {
  const quill = new Quill(selector, {
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['link', 'image', 'code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']
      ],
    },
    placeholder: 'Start writing your masterpiece...',
    theme: 'snow',
  });

  return quill;
}