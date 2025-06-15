export class VersionHistoryView {
    constructor(containerId, onSelectVersion, onRestoreVersion) {
        this.container = document.getElementById(containerId);
        this.onSelectVersion = onSelectVersion; // To preview a version
        this.onRestoreVersion = onRestoreVersion; // To revert to a version
        this.versions = [];
        this.activeNoteId = null;
    }

    render(versions, activeNoteId) {
        this.versions = versions;
        this.activeNoteId = activeNoteId;
        this.container.innerHTML = ''; // Clear previous content

        if (this.versions.length === 0) {
            this.container.innerHTML = '<p class="text-center text-gray-500 p-4">No version history available for this note.</p>';
            return;
        }

        const listHtml = this.versions.map(version => `
            <div class="p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer flex justify-between items-center">
                <div>
                    <p class="font-bold text-sm">Version ID: ${version.id}</p>
                    <p class="text-xs text-gray-400">Saved: ${new Date(version.versionTimestamp).toLocaleString()}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700" data-action="select" data-version-id="${version.id}">Preview</button>
                    <button class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" data-action="restore" data-version-id="${version.id}">Restore</button>
                </div>
            </div>
        `).join('');

        this.container.innerHTML = `<div class="bg-gray-800 rounded-md shadow-lg overflow-y-auto max-h-96">${listHtml}</div>`;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.querySelectorAll('button[data-action="select"]').forEach(button => {
            button.addEventListener('click', (e) => {
                this.onSelectVersion(parseInt(e.target.dataset.versionId));
            });
        });
        this.container.querySelectorAll('button[data-action="restore"]').forEach(button => {
            button.addEventListener('click', (e) => {
                if (confirm('Are you sure you want to restore to this version? Current changes will be lost.')) {
                    this.onRestoreVersion(parseInt(e.target.dataset.versionId));
                }
            });
        });
    }

    clear() {
        this.container.innerHTML = '';
        this.versions = [];
    }
}