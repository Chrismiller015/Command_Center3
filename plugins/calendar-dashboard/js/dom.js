// This helper will be used by all functions to get elements just-in-time
// and log a specific error if an element is not found.
export const findElOrLog = (id, functionName) => {
    const el = document.getElementById(id);
    if (!el) {
        // This log will tell us exactly where the failure is.
        console.error(`UI ERROR: Element with ID '${id}' was not found in the DOM when called by function '${functionName}'.`);
    }
    return el;
};

// This function switches which main view is visible.
export function switchView(viewId) {
    ['auth-view', 'main-view', 'message-view'].forEach(id => {
        const el = findElOrLog(id, 'switchView');
        if (el) el.classList.toggle('hidden', id !== viewId);
    });
}

// This function shows a message in the message-view container.
export function showMessage(text, isError = false) {
    switchView('message-view');
    const messageEl = findElOrLog('message-text', 'showMessage');
    if (messageEl) {
        messageEl.innerHTML = isError ? `<span class="text-red-400 font-bold">Error:</span> <pre class="text-sm text-red-400 whitespace-pre-wrap">${text}</pre>` : text;
    }
}