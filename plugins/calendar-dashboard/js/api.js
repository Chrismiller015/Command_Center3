// plugins/calendar-dashboard/js/api.js

// This file contains functions that interact with the Electron main process API.

// Helper to call service methods through the main process
const callService = async (methodName, params = {}) => {
    return window.electronAPI['plugin:service-call']({
        pluginId: 'calendar-dashboard',
        method: methodName,
        params: params
    });
};

export async function getEvents() {
    return callService('getEvents');
}

export async function checkAuthStatus() {
    return callService('checkAuthStatus');
}

export async function saveCredentialsAndGetAuthUrl() {
    return callService('saveCredentialsAndGetAuthUrl');
}

/**
 * Sends an event response update to the main process.
 * @param {string} eventId The ID of the event to update.
 * @param {string} responseStatus The new response status (e.g., 'accepted', 'declined').
 * @param {string} calendarId The calendar ID the event belongs to.
 * @param {string} attendeeEmail The email of the attendee (self).
 */
export async function updateEventResponse(eventId, responseStatus, calendarId, attendeeEmail) {
    if (responseStatus === 'accepted') {
        return callService('acceptMeeting', { eventId, calendarId, attendeeEmail });
    } else if (responseStatus === 'declined') {
        return callService('declineMeeting', { eventId, calendarId, attendeeEmail });
    } else {
        throw new Error('Unsupported response status.');
    }
}

export async function getCalendarList() {
    return callService('getCalendarList');
}

export async function updateCalendarColor({ calendarId, color }) {
    return callService('updateCalendarColor', { calendarId, color });
}

// These are general plugin settings APIs exposed by preload, not specific service calls
export async function getPluginSetting(key) {
    return window.electronAPI.getPluginSetting('calendar-dashboard', key);
}

export async function setPluginSetting(key, value) {
    return window.electronAPI.setPluginSetting('calendar-dashboard', key, value);
}