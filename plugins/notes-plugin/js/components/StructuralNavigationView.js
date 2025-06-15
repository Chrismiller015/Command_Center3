export class StructuralNavigationView {
    constructor(containerId, quillService, onNavigate) {
        this.container = document.getElementById(containerId); // Needs a container in index.html, e.g., <div id="structural-nav"></div>
        this.quillService = quillService;
        this.onNavigate = onNavigate; // Callback when a section is clicked
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.addEventListener('click', (event) => {
            const headingId = event.target.dataset.headingId;
            if (headingId) {
                // Future: Implement smooth scrolling to the heading in the editor
                console.log(`Navigating to heading: ${headingId}`);
                if (this.onNavigate) {
                    this.onNavigate(headingId);
                }
            }
        });
    }

    render() {
        // This method will parse the Quill content for headings (h1, h2, h3)
        // and create an interactive outline.
        const editorContent = this.quillService.getHTML();
        const parser = new DOMParser();
        const doc = parser.parseFromString(editorContent, 'text/html');
        const headings = doc.querySelectorAll('h1, h2, h3');

        let outlineHtml = '<ul class="space-y-1 text-gray-300">';
        headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.replace('H', ''));
            const text = heading.textContent.trim();
            // Assign a stable ID if not present for navigation
            const headingId = heading.id || `heading-${index}`;
            heading.id = headingId; // Ensure the actual heading in the editor has an ID

            outlineHtml += `
                <li style="margin-left: ${(level - 1) * 1.2}rem;">
                    <button class="text-left hover:text-indigo-400 focus:outline-none" data-heading-id="${headingId}">
                        ${text}
                    </button>
                </li>
            `;
        });
        outlineHtml += '</ul>';

        this.container.innerHTML = `
            <div class="p-4 bg-gray-800 rounded-lg shadow-md">
                <h3 class="font-bold text-lg text-white mb-3">Note Outline</h3>
                ${outlineHtml}
                ${headings.length === 0 ? '<p class="text-center text-gray-500 text-sm">No headings found.</p>' : ''}
            </div>
        `;
    }

    clear() {
        this.container.innerHTML = '';
    }
}