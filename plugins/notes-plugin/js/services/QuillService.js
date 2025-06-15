// This assumes Quill.js is loaded globally via a script tag in index.html
export class QuillService {
    constructor(editorSelector) {
        this.quillInstance = new Quill(editorSelector, {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'blockquote', 'code-block'],
                    ['clean']
                ]
            }
        });
    }

    getHTML() {
        return this.quillInstance.root.innerHTML;
    }

    setHTML(html) {
        this.quillInstance.root.innerHTML = html;
    }

    focus() {
        this.quillInstance.focus();
    }

    onTextChange(callback) {
        this.quillInstance.on('text-change', callback);
    }

    // You will add methods here to handle:
    // - Adding custom Quill modules (for tables, math, checklists, code highlighting)
    // - Getting content in specific formats (Delta, plain text)
    // - Inserting content (templates, variables)
}