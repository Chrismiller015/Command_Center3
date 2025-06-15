/** Formats a date string into a more readable format. */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

// Add other general utility functions here
// export const sanitizeHTML = (html) => { /* ... */ };
// export const parseTags = (tagString) => { /* ... */ };