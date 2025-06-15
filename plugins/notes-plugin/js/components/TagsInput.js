export class TagsInput {
    constructor(inputId, onTagsChange) {
        this.inputEl = document.getElementById(inputId);
        this.onTagsChange = onTagsChange;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.inputEl.addEventListener('input', () => {
            this.onTagsChange(this.getTags());
        });
        // Future: Add event listeners for Enter/Comma to finalize tags,
        // display tags as pills, and integrate auto-suggestion for existing tags.
    }

    getTags() {
        // Returns an array of trimmed tag strings
        return this.inputEl.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }

    setTags(tagsArray) {
        // Sets the input value from an array of tags
        this.inputEl.value = tagsArray.join(', ');
    }

    clear() {
        this.inputEl.value = '';
    }
}