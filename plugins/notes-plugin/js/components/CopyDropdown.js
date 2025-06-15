import { ExportService } from '../services/ExportService.js'; // Will be created soon
import * as API from '../api.js';

export class CopyDropdown {
    constructor(containerId, quillService) {
        this.container = document.getElementById(containerId);
        this.quillService = quillService;
        this.exportService = new ExportService(); // Initialize ExportService

        this.copyOptions = [
            { label: 'Google Docs (HTML)', format: 'html' },
            { label: 'Google Sheets (CSV/TSV)', format: 'tsv' },
            { label: 'Microsoft Word (RTF)', format: 'rtf' },
            { label: 'Excel (CSV/TSV)', format: 'tsv' },
            { label: 'Markdown', format: 'markdown' },
            { label: 'Plain Text', format: 'text' }
        ];

        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        this.container.innerHTML = `
            <div class="relative inline-block text-left">
                <div>
                    <button type="button" class="inline-flex justify-center w-full rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500" id="copy-menu-button" aria-expanded="true" aria-haspopup="true">
                        Copy For...
                        <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>

                <div id="copy-menu" class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 hidden" role="menu" aria-orientation="vertical" aria-labelledby="copy-menu-button" tabindex="-1">
                    <div class="py-1" role="none">
                        ${this.copyOptions.map(option => `
                            <button class="text-gray-300 block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 hover:text-white" role="menuitem" tabindex="-1" data-format="${option.format}">
                                ${option.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        this.menuButton = this.container.querySelector('#copy-menu-button');
        this.menu = this.container.querySelector('#copy-menu');
    }

    setupEventListeners() {
        this.menuButton.addEventListener('click', () => {
            this.menu.classList.toggle('hidden');
        });

        this.menu.addEventListener('click', async (event) => {
            const button = event.target.closest('button');
            if (button && button.dataset.format) {
                const format = button.dataset.format;
                const htmlContent = this.quillService.getHTML();
                
                try {
                    const formattedContent = await this.exportService.convertToFormat(htmlContent, format);
                    // This `writeToClipboard` will be a new electronAPI method.
                    await API.writeToClipboard(format, formattedContent); 
                    alert(`Content copied to clipboard for ${format} successfully!`);
                } catch (error) {
                    console.error('Failed to copy content:', error);
                    alert(`Failed to copy content for ${format}. Error: ${error.message}`);
                } finally {
                    this.menu.classList.add('hidden'); // Hide menu after selection
                }
            }
        });

        // Hide dropdown if clicked outside
        document.addEventListener('click', (event) => {
            if (!this.container.contains(event.target)) {
                this.menu.classList.add('hidden');
            }
        });
    }
}