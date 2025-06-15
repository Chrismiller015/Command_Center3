import { NoteAPI } from './api.js';
import { initializeQuill } from './services/QuillService.js';
import { renderNotesList } from './components/NotesList.js';
import { setupActionButtons } from './components/NoteActions.js';
// FIX: Import the SearchBar CLASS, not a function
import { SearchBar } from './components/SearchBar.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("Notes Plugin DOM fully loaded and parsed");

  // State Management
  let allNotes = [];
  let currentNote = null;

  // DOM Elements
  const notesListContainer = document.getElementById('notes-list');
  const welcomeView = document.getElementById('welcome-view');
  const editorView = document.getElementById('editor-view');

  // Initialize Services
  const quill = initializeQuill('#editor-container');
  
  setupActionButtons({
    onNewNote: handleNewNote,
    onDeleteNote: handleDeleteNote,
  });
  
  // FIX: Create a new instance of the SearchBar class
  new SearchBar('search-input', (query) => {
    handleSearch(query);
  });

  // --- Core Functions ---

  async function loadNotes() {
    try {
      console.log('Loading notes...');
      const notes = await NoteAPI.getNotes();
      allNotes = notes;
      renderNotesList(notesListContainer, allNotes, handleNoteSelect);
      console.log('Notes loaded successfully:', allNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
      notesListContainer.innerHTML = '<p class="text-red-400 p-4">Error loading notes.</p>';
    }
  }

  async function handleNoteSelect(noteId) {
    try {
      currentNote = await NoteAPI.getNote(noteId);
      if (currentNote) {
        let contentToLoad = '';
        try {
          contentToLoad = JSON.parse(currentNote.content);
        } catch (e) {
          console.warn("Note content is not valid JSON, loading as plain text.");
          contentToLoad = { ops: [{ insert: currentNote.content || '' }] };
        }
        quill.setContents(contentToLoad);
        welcomeView.classList.add('hidden');
        editorView.classList.remove('hidden');
      } else {
        console.error(`Note with id ${noteId} not found.`);
        showWelcomeView();
      }
    } catch (error) {
      console.error(`Error loading note ${noteId}:`, error);
    }
  }

  async function handleNewNote() {
    try {
      const newNote = await NoteAPI.createNote({
        title: 'New Note',
        content: JSON.stringify({ ops: [{ insert: '\n' }] }),
      });
      await loadNotes();
      handleNoteSelect(newNote.id);
    } catch (error) {
      console.error('Error creating new note:', error);
    }
  }
  
  async function handleDeleteNote() {
    if (!currentNote) return;

    try {
      await NoteAPI.deleteNote(currentNote.id);
      currentNote = null;
      await loadNotes();
      showWelcomeView();
    } catch (error)      {
      console.error(`Error deleting note ${currentNote.id}:`, error);
    }
  }

  async function handleSearch(query) {
    if (!query) {
      renderNotesList(notesListContainer, allNotes, handleNoteSelect);
      return;
    }
    try {
      const filteredNotes = await NoteAPI.searchNotes(query);
      renderNotesList(notesListContainer, filteredNotes, handleNoteSelect);
    } catch (error) {
      console.error('Error during search:', error);
    }
  }

  function showWelcomeView() {
    welcomeView.classList.remove('hidden');
    editorView.classList.add('hidden');
  }

  // --- Initial Load ---
  function initializeApp() {
    console.log("Initializing Notes Plugin App...");
    showWelcomeView();
    loadNotes();
  }

  initializeApp();
});