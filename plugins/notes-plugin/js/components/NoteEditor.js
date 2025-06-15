export class NoteEditor {
    constructor(editorContainerId, quillService) {
        this.editorContainer = document.getElementById(editorContainerId);
        this.quillService = quillService;
    }

    render() {
        // The Quill editor itself is initialized by QuillService in app.js
        // This component focuses on managing its display and interactions
        // For now, it just ensures the container is visible.
        // Future: Integrate toolbar rendering here.
        this.editorContainer.classList.remove('hidden');
    }

    setContent(html) {
        this.quillService.setHTML(html);
    }

    getContent() {
        return this.quillService.getHTML();
    }

    focus() {
        this.quillService.focus();
    }

    onTextChange(callback) {
        this.quillService.onTextChange(callback);
    }

    // Future: Methods to handle inserting templates, variables,
    // rich elements (tables, code blocks, math)
}