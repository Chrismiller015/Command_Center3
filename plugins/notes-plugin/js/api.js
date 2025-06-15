/**
 * A module for interacting with the main process and the plugin's backend service
 * from within the Notes plugin's renderer process.
 */

const PLUGIN_ID = 'notes-plugin';

/**
 * A generic helper to call a method on the plugin's backend service.
 * @param {string} method The name of the method to call.
 * @param {object} params The parameters to pass to the method.
 * @returns {Promise<any>}
 */
function callService(method, params = {}) {
  // The 'electronAPI' object is attached to the window object by the preload script.
  if (!window.electronAPI) {
    throw new Error('electronAPI is not available. Preload script may have failed.');
  }
  return window.electronAPI.callPluginService(PLUGIN_ID, method, params);
}

export const NoteAPI = {
  // FIX: Changed to use the generic callService helper
  getNotes: (params) => callService('getNotes', params),
  getNote: (id) => callService('getNote', { id }),
  createNote: (noteData) => callService('createNote', noteData),
  updateNote: (noteData) => callService('updateNote', noteData),
  deleteNote: (id) => callService('deleteNote', { id }),

  getTags: (params) => callService('getTags', params),
  addTagToNote: (params) => callService('addTagToNote', params),
  removeTagFromNote: (params) => callService('removeTagFromNote', params),
  
  getFolders: () => callService('getFolders'),
  createFolder: (name) => callService('createFolder', { name }),
  renameFolder: (folderData) => callService('renameFolder', folderData),
  deleteFolder: (id) => callService('deleteFolder', { id }),
  
  // ... and so on for other features like versions, links, reminders, etc.
  searchNotes: (query) => callService('searchNotes', { query }),
};

// You can also export other specific API groups if needed
// export const VersionAPI = { ... };