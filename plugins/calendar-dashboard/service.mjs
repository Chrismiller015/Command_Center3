// plugins/calendar-dashboard/service.mjs
import { google } from 'googleapis';
import { ipcMain, shell } from 'electron';
import http from 'http';
import url from 'url';

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const REDIRECT_URI = 'http://localhost:8888';

let oAuth2Client = null;
let currentPluginId = 'calendar-dashboard';
let db = null;
let mainWindow = null;

export const init = (injectedDb, inMainWindow) => {
    db = injectedDb;
    mainWindow = inMainWindow;
    console.log(`[${currentPluginId} Service] Initialized.`);
};

const savePluginSetting = async (key, value) => {
    return await db.setPluginSetting(currentPluginId, key, value);
};

const getPluginSetting = async (key) => {
    const settings = await db.getPluginSettings(currentPluginId);
    return settings[key] || null;
};

const getAuthClient = async () => {
    const clientId = await getPluginSetting('googleClientId');
    const clientSecret = await getPluginSetting('googleClientSecret');
    const tokens = await getPluginSetting('googleTokens');

    if (!clientId || !clientSecret) {
        throw new Error('Google Client ID and Client Secret are not configured in settings.');
    }

    oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    if (tokens) {
        oAuth2Client.setCredentials(JSON.parse(tokens));
        if (oAuth2Client.credentials.expiry_date && oAuth2Client.credentials.expiry_date < Date.now() + 60 * 1000) {
            console.log(`[${currentPluginId} Service] Refreshing access token...`);
            try {
                const refreshedTokens = await oAuth2Client.refreshAccessToken();
                await savePluginSetting('googleTokens', JSON.stringify(refreshedTokens.credentials));
                oAuth2Client.setCredentials(refreshedTokens.credentials);
                console.log(`[${currentPluginId} Service] Access token refreshed successfully.`);
            } catch (refreshError) {
                console.error(`[${currentPluginId} Service] Error refreshing token:`, refreshError.message);
                await savePluginSetting('googleTokens', '');
                throw new Error('Failed to refresh access token. Please re-authenticate.');
            }
        }
    }
    return oAuth2Client;
};

export const checkAuthStatus = async () => {
    const settings = await db.getPluginSettings(currentPluginId);
    const isConfigured = !!settings.googleClientId && !!settings.googleClientSecret;
    const isAuthenticated = !!settings.googleTokens;

    if (isConfigured && isAuthenticated) {
        try {
            await getAuthClient();
            return { isConfigured: true, isAuthenticated: true };
        } catch (error) {
            console.warn(`[${currentPluginId} Service] Token check failed:`, error.message);
            return { isConfigured: true, isAuthenticated: false, message: error.message };
        }
    }
    return { isConfigured, isAuthenticated, clientId: settings.googleClientId, clientSecret: settings.googleClientSecret };
};

export const saveCredentialsAndGetAuthUrl = async ({ clientId, clientSecret }) => {
    await savePluginSetting('googleClientId', clientId);
    await savePluginSetting('googleClientSecret', clientSecret);
    await savePluginSetting('googleTokens', '');
    await savePluginSetting('syncedCalendars', '[]');
    await savePluginSetting('calendarList', null);

    oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: GOOGLE_SCOPES,
    });

    const server = http.createServer(async (req, res) => {
        try {
            const requestUrl = new url.URL(req.url, REDIRECT_URI);
            const code = requestUrl.searchParams.get('code');

            res.end('Authentication successful! You can close this tab.');
            server.close();

            if (!code) {
                mainWindow.webContents.send('auth-failure', { pluginId: currentPluginId, error: 'No authorization code received.' });
                return;
            }

            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);
            await savePluginSetting('googleTokens', JSON.stringify(tokens));

            await fetchAndSaveCalendarList();

            mainWindow.webContents.send('auth-success', { pluginId: currentPluginId });

        } catch (e) {
            console.error(`[${currentPluginId} Service] Auth callback error:`, e);
            mainWindow.webContents.send('auth-failure', { pluginId: currentPluginId, error: e.message });
        }
    }).listen(8888, () => {
        console.log(`[${currentPluginId} Service] Local server listening on ${REDIRECT_URI}`);
        shell.openExternal(authUrl);
    });

    return { authUrl };
};

export const clearAuthData = async () => {
    await savePluginSetting('googleClientId', null);
    await savePluginSetting('googleClientSecret', null);
    await savePluginSetting('googleTokens', null);
    await savePluginSetting('syncedCalendars', null);
    await savePluginSetting('calendarList', null);
    oAuth2Client = null;
    console.log(`[${currentPluginId} Service] Cleared authentication data.`);
};

const getAuthenticatedClient = async () => {
    if (oAuth2Client && oAuth2Client.credentials.access_token) {
        return oAuth2Client;
    }

    const clientId = await getPluginSetting('googleClientId');
    const clientSecret = await getPluginSetting('googleClientSecret');
    const tokens = await getPluginSetting('googleTokens');

    if (!clientId || !clientSecret || !tokens) {
        throw new Error('Google API credentials or tokens are missing. Please re-authenticate.');
    }

    oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
    oAuth2Client.setCredentials(JSON.parse(tokens));

    return oAuth2Client;
};

export const fetchAndSaveCalendarList = async () => {
    const client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: client });
    const res = await calendar.calendarList.list();

    const calendars = res.data.items.map(c => ({ id: c.id, summary: c.summary, primary: !!c.primary }));
    const initialSynced = calendars.filter(c => c.primary).map(c => c.id);

    await savePluginSetting('calendarList', JSON.stringify(calendars));
    await savePluginSetting('syncedCalendars', JSON.stringify(initialSynced));
    console.log(`[${currentPluginId} Service] Fetched and saved initial calendar list.`);
    return calendars;
};

export const getCalendarList = async () => {
    const savedList = await getPluginSetting('calendarList');
    if (savedList) {
        return JSON.parse(savedList);
    }
    return await fetchAndSaveCalendarList();
};

export async function getEvents() {
    const client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth: client });

    const syncedCalendarsJson = await getPluginSetting('syncedCalendars');
    const syncedCalendars = syncedCalendarsJson ? JSON.parse(syncedCalendarsJson) : [];

    if (syncedCalendars.length === 0) {
        return { upcomingEvents: [], displayDateKeys: [] };
    }

    const now = new Date();

    const todayMidnightLocal = new Date(now);
    todayMidnightLocal.setHours(0, 0, 0, 0);
    const todayString = todayMidnightLocal.toISOString().split('T')[0];

    console.log(`[${currentPluginId} Service Debug] Current 'now' (local time): ${now.toLocaleString()} (UTC: ${now.toISOString()})`);
    console.log(`[${currentPluginId} Service Debug] 'todayMidnightLocal' (local midnight): ${todayMidnightLocal.toLocaleString()} (UTC: ${todayMidnightLocal.toISOString()})`);
    console.log(`[${currentPluginId} Service Debug] 'todayString': ${todayString}`);


    let timeMax = new Date(todayMidnightLocal);
    const dayOfWeek = todayMidnightLocal.getDay();

    if (dayOfWeek === 0) {
        timeMax.setDate(todayMidnightLocal.getDate() + 5);
    } else if (dayOfWeek === 6) {
        timeMax.setDate(todayMidnightLocal.getDate() + 6);
    } else {
        timeMax.setDate(todayMidnightLocal.getDate() + (5 - dayOfWeek));
    }
    timeMax.setHours(23, 59, 59, 999);

    const apiTimeMin = todayMidnightLocal.toISOString();

    console.log(`[${currentPluginId} Service Debug] API Fetch Range: timeMin = ${apiTimeMin} | timeMax = ${timeMax.toISOString()}`);
    console.log(`[${currentPluginId} Service Debug] API Request TimeZone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    const eventsPromises = syncedCalendars.map(calId =>
        calendar.events.list({
            calendarId: calId,
            timeMin: apiTimeMin,
            timeMax: timeMax.toISOString(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
    );

    const results = await Promise.all(eventsPromises);
    const allEvents = results.flatMap(res => res.data.items || []);

    console.log(`[${currentPluginId} Service Debug] Raw events fetched from API (${allEvents.length}):`);
    allEvents.slice(0, 5).forEach(e => console.log(`  - ${e.summary}: Start=${e.start?.dateTime || e.start?.date}, End=${e.end?.dateTime || e.end?.date}, Status=${e.status}`));
    if (allEvents.length > 5) console.log('  ... (showing first 5 events)');


    const upcomingEvents = allEvents
        .filter(e => {
            if (!e.start || !e.end || (!e.start.dateTime && !e.start.date) || (!e.end.dateTime && !e.end.date)) {
                console.log(`[${currentPluginId} Service Debug] Skipping event (missing start/end): ${e.summary}`);
                return false;
            }
            if (e.status === 'cancelled') {
                console.log(`[${currentPluginId} Service Debug] Skipping cancelled event: ${e.summary}`);
                return false;
            }

            if (e.start.dateTime) { // Timed event
                const eventStart = new Date(e.start.dateTime);
                const eventEnd = new Date(e.end.dateTime);

                // Keep if:
                // 1. Event has not ended yet (its end time is >= now) AND
                // 2. Event starts today or later (its start time is >= todayMidnightLocal)
                const isUpcoming = eventEnd.getTime() >= now.getTime() && eventStart.getTime() >= todayMidnightLocal.getTime();

                console.log(`[${currentPluginId} Service Debug] Filtering Timed Event: "${e.summary}" | Start: ${eventStart.toLocaleString()} | End: ${eventEnd.toLocaleString()} | Now: ${now.toLocaleString()} | TodayMidnight: ${todayMidnightLocal.toLocaleString()} | Keep: ${isUpcoming}`);
                return isUpcoming;
            } else { // All-day event (only has e.start.date)
                const eventDateString = e.start.date;
                const isUpcoming = eventDateString >= todayString;
                console.log(`[${currentPluginId} Service Debug] Filtering All-Day Event: "${e.summary}" | EventDate: ${eventDateString} | TodayString: ${todayString} | Keep: ${isUpcoming}`);
                return isUpcoming;
            }
        })
        .sort((a, b) => {
            const startA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : new Date(a.start.date).getTime();
            const startB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : new Date(b.start.date).getTime();
            return startA - startB;
        });

    console.log(`[${currentPluginId} Service Debug] Filtered upcomingEvents (${upcomingEvents.length}):`);
    upcomingEvents.slice(0, 5).forEach(e => console.log(`  - ${e.summary}: Start=${e.start?.dateTime || e.start?.date}`));
    if (upcomingEvents.length > 5) console.log('  ... (showing first 5 filtered events)');


    const displayDateKeys = [];
    let dayIterator = new Date(todayMidnightLocal);
    const currentDayOfWeek = todayMidnightLocal.getDay();

    if (currentDayOfWeek === 0) {
        dayIterator.setDate(todayMidnightLocal.getDate() + 1);
    } else if (currentDayOfWeek === 6) {
        dayIterator.setDate(todayMidnightLocal.getDate() + 2);
    }

    const timeMaxDateOnly = new Date(timeMax);
    timeMaxDateOnly.setHours(0, 0, 0, 0);

    let loopCounter = 0;
    while (dayIterator.getTime() <= timeMaxDateOnly.getTime() && loopCounter < 7) {
        const dayOfWeek = dayIterator.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            displayDateKeys.push(dayIterator.toISOString().split('T')[0]);
        }
        dayIterator.setDate(dayIterator.getDate() + 1);
        loopCounter++;
    }
    console.log(`[${currentPluginId} Service Debug] Generated displayDateKeys:`, displayDateKeys);


    return { upcomingEvents, displayDateKeys };
}