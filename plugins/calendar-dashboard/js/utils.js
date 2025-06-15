// plugins/calendar-dashboard/js/utils.js

export function formatTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

export function formatEventTime(event) {
    const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date + 'T00:00:00');
    const end = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date + 'T23:59:59');

    // All-day event
    if (!event.start.dateTime && !event.end.dateTime) {
        if (start.toDateString() === end.toDateString()) {
            return `All day on ${formatDate(event.start.date)}`;
        } else {
            return `All day from ${formatDate(event.start.date)} to ${formatDate(event.end.date)}`;
        }
    }

    // Single day timed event
    if (start.toDateString() === end.toDateString()) {
        return `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)} on ${formatDate(event.start.dateTime)}`;
    } 
    // Multi-day timed event
    else {
        return `${formatDate(event.start.dateTime)} ${formatTime(event.start.dateTime)} - ${formatDate(event.end.dateTime)} ${formatTime(event.end.dateTime)}`;
    }
}


export function getMeetingLink(event) {
    if (event.conferenceData && event.conferenceData.entryPoints) {
        const videoCall = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video' || ep.entryPointType === 'more');
        if (videoCall) {
            return videoCall.uri;
        }
    }
    // Fallback for Google Meet links in description or location
    const regex = /(https?:\/\/(?:meet\.google\.com\/[a-z0-9-]+|zoom\.us\/j\/\d+|teams\.microsoft\.com\/l\/meet\/[^"]+))/;
    const descMatch = event.description ? event.description.match(regex) : null;
    const locMatch = event.location ? event.location.match(regex) : null;
    return descMatch ? descMatch[0] : (locMatch ? locMatch[0] : null);
}

// Helper to unescape HTML entities
function unescapeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
}

export function formatDescription(description) {
    if (!description) return '';

    // First, unescape any HTML entities if they exist
    let unescapedDescription = unescapeHtml(description);

    // Basic rich text (bold, italic) and links from common markdown-like formats
    let formatted = unescapedDescription
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/__(.*?)__/g, '<u>$1</u>')   // Underline (common in some rich text)
        // Convert URLs to clickable links
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-400 hover:underline">$1</a>');

    // Collapse multiple newlines into single ones for display clarity
    formatted = formatted.replace(/(\r\n|\n|\r){2,}/g, '$1\n');

    // Simple "show more" for long descriptions
    const maxLength = 200; // Characters
    if (formatted.length > maxLength) {
        const truncated = formatted.substring(0, maxLength);
        const remaining = formatted.substring(maxLength);
        // Use 'truncated-content' class here. Its initial display will be managed by CSS or modals.js.
        return `${truncated}<span class="truncated-content">${remaining}</span>... <a href="#" class="show-more-link text-blue-400 hover:underline text-sm">Show More</a>`;
    }
    return formatted;
}

// This function is imported and used by main.js
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    } else {
        console.warn(`[Calendar Plugin] closeModal: Modal with ID '${modalId}' not found.`);
    }
}