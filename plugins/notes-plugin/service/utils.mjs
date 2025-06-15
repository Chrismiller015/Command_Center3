// Backend utility functions for the Notes plugin service

/**
 * Sanitizes a string for safe use in SQL table/column names if dynamically generated.
 * (Note: For manifest-defined tables, sanitization is handled by the main app's database.js)
 * @param {string} id
 * @returns {string}
 */
export function sanitizeForSQL(str) {
    return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Formats a Date object or ISO string into a consistent ISO 8601 string for database storage.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDbDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toISOString();
}

// Add other backend-specific utilities here as needed
// e.g., for parsing complex search queries, handling file paths, etc.