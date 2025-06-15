const PLUGIN_ID = 'calendar-dashboard';

function invokeService(method, params = {}) {
    return window.electronAPI.invoke('plugin:service-call', {
        pluginId: PLUGIN_ID,
        method,
        params
    });
}

export const checkAuthStatus = () => invokeService('checkAuthStatus');
export const getEvents = () => invokeService('getEvents');
export const getCalendarList = () => invokeService('getCalendarList');
export const clearAuthData = () => invokeService('clearAuthData');
export const saveCredentialsAndGetAuthUrl = (params) => invokeService('saveCredentialsAndGetAuthUrl', params);
export const acceptMeeting = (params) => invokeService('acceptMeeting', params);
export const declineMeeting = (params) => invokeService('declineMeeting', params); // New line
export const updateCalendarColor = (params) => invokeService('updateCalendarColor', params);

export const getPluginSettings = () => window.electronAPI.getPluginSettings(PLUGIN_ID);
export const setPluginSetting = (key, value) => window.electronAPI.setPluginSetting(PLUGIN_ID, key, value);