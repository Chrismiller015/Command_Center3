export class TemplateSelector {
    constructor(containerId, onApplyTemplate) {
        this.container = document.getElementById(containerId); // Needs container, e.g., <div id="template-selector"></div>
        this.onApplyTemplate = onApplyTemplate;
        this.templates = []; // This will be fetched from backend later

        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        this.container.innerHTML = `
            <div class="p-4 bg-gray-800 rounded-lg shadow-md mt-4">
                <h3 class="font-bold text-lg text-white mb-3">Templates</h3>
                <select id="template-dropdown" class="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 mb-2">
                    <option value="">Select a template...</option>
                    </select>
                <button id="apply-template-btn" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700">Apply Template</button>
                <button id="save-as-template-btn" class="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 mt-2">Save Current as Template</button>
            </div>
        `;
        this.templateDropdown = this.container.querySelector('#template-dropdown');
        this.applyTemplateBtn = this.container.querySelector('#apply-template-btn');
        this.saveAsTemplateBtn = this.container.querySelector('#save-as-template-btn');
    }

    setupEventListeners() {
        this.applyTemplateBtn.addEventListener('click', () => {
            const selectedTemplateId = this.templateDropdown.value;
            if (selectedTemplateId) {
                this.onApplyTemplate(selectedTemplateId);
            } else {
                alert('Please select a template to apply.');
            }
        });
        this.saveAsTemplateBtn.addEventListener('click', () => {
            const templateName = prompt('Enter a name for the new template:');
            if (templateName) {
                // This would trigger a save action via app.js -> API -> backend
                console.log(`Attempting to save current note as template: ${templateName}`);
            }
        });
    }

    renderTemplates(templates) {
        this.templates = templates;
        this.templateDropdown.innerHTML = '<option value="">Select a template...</option>';
        this.templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id; // Assuming template has an ID
            option.textContent = template.name;
            this.templateDropdown.appendChild(option);
        });
    }

    clear() {
        this.templateDropdown.innerHTML = '<option value="">Select a template...</option>';
        this.templates = [];
    }
}