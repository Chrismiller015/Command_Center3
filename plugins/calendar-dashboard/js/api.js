// plugins/calendar-dashboard/js/api.js

// This file contains functions that interact with the Electron main process API.

export async function getEvents() {
    return window.electronAPI.getCalendarEvents();
}

export async function getAuthUrl() {
    return window.electronAPI.getGoogleAuthUrl();
}

export async function checkAuthStatus() {
    return window.electronAPI.checkGoogleAuthStatus();
}

export async function saveCredentialsAndGetAuthUrl(clientId, clientSecret) {
    return window.electronAPI.saveGoogleApiCredentials(clientId, clientSecret);
}

export async function getPluginSetting(pluginId, key) {
    return window.electronAPI.getPluginSetting(pluginId, key);
}

export async function setPluginSetting(pluginId, key, value) {
    return window.electronAPI.setPluginSetting(pluginId, key, value);
}

/**
 * Sends an event response update to the main process.
 * @param {string} eventId The ID of the event to update.
 * @param {string} responseStatus The new response status (e.g., 'accepted', 'declined').
 */
export async function updateEventResponse(eventId, responseStatus) {
    // This will send an IPC message to the main process, which then handles the API call to Google.
    return window.api.updateEventResponse(eventId, responseStatus);
}