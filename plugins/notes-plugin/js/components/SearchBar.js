export class SearchBar {
    constructor(searchBarId, onSearch) {
        this.searchBarEl = document.getElementById(searchBarId);
        this.onSearch = onSearch;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.searchBarEl.addEventListener('input', () => {
            this.onSearch(this.searchBarEl.value);
        });
        // Future: Add event listener for Enter key to trigger advanced search
    }

    getValue() {
        return this.searchBarEl.value;
    }

    setValue(value) {
        this.searchBarEl.value = value;
    }
}