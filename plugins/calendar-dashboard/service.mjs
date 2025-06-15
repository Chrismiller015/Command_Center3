import { google } from 'googleapis';
import { shell } from 'electron';
import http from 'http';
import url from 'url';

const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
];
const REDIRECT_URI = 'http://localhost:8888';
const DEFAULT_COLORS = ['#4299E1', '#48BB78', '#ECC94B', '#ED8936', '#F56565', '#9F7AEA', '#ED64A6', '#38B2AC', '#667EEA'];

let db = null;
let mainWindow = null;
let oAuth2Client = null;
const PLUGIN_ID = 'calendar-dashboard';

export const init = (injectedDb, inMainWindow) => {
    db = injectedDb;
    mainWindow = inMainWindow;
    console.log(`[${PLUGIN_ID} Service] Initialized.`);
};

const getSettings = async () => await db.getPluginSettings(PLUGIN_ID);
const setSetting = async (key, value) => await db.setPluginSetting(PLUGIN_ID, key, value);

const getAuthClient = async () => {
    const settings = await getSettings();
    if (!settings.googleClientId || !settings.googleClientSecret) {
        throw new Error('Google Client ID and Secret are not configured.');
    }
    oAuth2Client = new google.auth.OAuth2(settings.googleClientId, settings.googleClientSecret, REDIRECT_URI);
    if (settings.googleTokens) {
        try {
            const tokens = JSON.parse(settings.googleTokens);
            oAuth2Client.setCredentials(tokens);
            if (oAuth2Client.credentials.expiry_date && oAuth2Client.credentials.expiry_date < (Date.now() + 60000)) {
                console.log(`[${PLUGIN_ID} Service] Refreshing access token...`);
                const { credentials } = await oAuth2Client.refreshAccessToken();
                oAuth2Client.setCredentials(credentials);
                await setSetting('googleTokens', JSON.stringify(credentials));
            }
        } catch (e) {
            await setSetting('googleTokens', null);
            throw new Error('Your authentication token is invalid. Please re-authenticate.');
        }
    }
    return oAuth2Client;
};

export const checkAuthStatus = async () => {
    const settings = await getSettings();
    const isConfigured = !!(settings.googleClientId && settings.googleClientSecret);
    let isAuthenticated = false;
    if (isConfigured && settings.googleTokens) {
        try {
            await getAuthClient();
            isAuthenticated = !!(oAuth2Client && oAuth2Client.credentials.access_token);
        } catch(e) {
            isAuthenticated = false;
        }
    }
    return { isConfigured, isAuthenticated };
};

export const saveCredentialsAndGetAuthUrl = async () => {
    // Ensure the module-level oAuth2Client is configured with the latest credentials.
    const client = await getAuthClient(); 
    
    // Clear any old tokens to ensure a fresh login
    await Promise.all([
        setSetting('googleTokens', null),
        setSetting('syncedCalendars', null),
        setSetting('calendarList', null)
    ]);

    const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: GOOGLE_SCOPES
    });
    
    // Create a temporary server to handle the OAuth2 callback
    http.createServer(async (req, res) => {
        console.log('[Auth Server] Received callback from Google.');
        try {
            const code = new url.URL(req.url, REDIRECT_URI).searchParams.get('code');
            res.end('Authentication successful! You can close this window.');
            req.socket.server.close();
            
            if (!code) {
                throw new Error("No authorization code received from Google.");
            }
            console.log('[Auth Server] Authorization code received. Exchanging for tokens...');

            const { tokens } = await client.getToken(code);
            console.log('[Auth Server] Tokens received successfully.');
            
            client.setCredentials(tokens);

            console.log('[Auth Server] Saving tokens to database...');
            await setSetting('googleTokens', JSON.stringify(tokens));
            console.log('[Auth Server] Tokens saved successfully.');

            console.log('[Auth Server] Sending auth-success message to renderer.');
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('auth-success', { pluginId: PLUGIN_ID });
            } else {
                console.error('[Auth Server] Cannot send auth-success message: mainWindow is not available.');
            }

        } catch (e) {
            console.error(`[Auth Server] CRITICAL FAILURE: ${e.message}`, e.stack);
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('auth-failure', { pluginId: PLUGIN_ID, error: e.message });
            }
        }
    }).listen(8888, () => {
        console.log('[Auth Server] Opening browser for authentication.');
        shell.openExternal(authUrl);
    });

    return { authUrl };
};

export const getCalendarList = async () => {
    const client = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: client });
    const res = await calendar.calendarList.list();
    let newCalendarList = res.data.items;
    const settings = await getSettings();
    const oldCalendarList = settings.calendarList ? JSON.parse(settings.calendarList) : [];
    const oldColorMap = new Map(oldCalendarList.map(c => [c.id, c.color]));
    let colorIndex = 0;
    newCalendarList = newCalendarList.map(cal => ({
        ...cal,
        color: oldColorMap.get(cal.id) || DEFAULT_COLORS[colorIndex++ % DEFAULT_COLORS.length]
    }));
    await setSetting('calendarList', JSON.stringify(newCalendarList));
    return newCalendarList;
};

export const updateCalendarColor = async ({ calendarId, color }) => {
    const settings = await getSettings();
    let calendarList = settings.calendarList ? JSON.parse(settings.calendarList) : [];
    const calIndex = calendarList.findIndex(c => c.id === calendarId);
    if (calIndex !== -1) {
        calendarList[calIndex].color = color;
        await setSetting('calendarList', JSON.stringify(calendarList));
    }
    return { success: true };
};

export const clearAuthData = async () => {
    await Promise.all([
        setSetting('googleTokens', null),
        setSetting('calendarList', null),
        setSetting('syncedCalendars', null)
    ]);
    oAuth2Client = null;
    console.log(`[${PLUGIN_ID} Service] Cleared authentication tokens and calendar data.`);
};

export const acceptMeeting = async ({ eventId, calendarId, attendeeEmail }) => {
    const client = await getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth: client });
    const event = await calendar.events.get({ calendarId, eventId });
    const attendees = event.data.attendees || [];
    const selfIndex = attendees.findIndex(a => a.email === attendeeEmail);
    if (selfIndex !== -1) {
        attendees[selfIndex].responseStatus = 'accepted';
    } else {
        throw new Error("Could not find your email in the attendee list to update status.");
    }
    await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: { attendees }
    });
    return { success: true };
};

export const getEvents = async () => {
    const client = await getAuthClient();
    const settings = await getSettings();
    const calendar = google.calendar({ version: 'v3', auth: client });
    const calendarIds = settings.syncedCalendars ? JSON.parse(settings.syncedCalendars) : [];
    const calendarList = settings.calendarList ? JSON.parse(settings.calendarList) : await getCalendarList();
    const calendarColorMap = new Map(calendarList.map(c => [c.id, c.color]));
    if (calendarIds.length === 0) return { upcomingEvents: [], displayDateKeys: [] };
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8).toISOString();
    let allItems = [];
    const eventsPromises = calendarIds.map(calendarId =>
        calendar.events.list({ calendarId, timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 50, timeZone: 'America/Chicago' })
            .then(res => res.data.items ? res.data.items.map(item => ({ ...item, calendarColor: calendarColorMap.get(calendarId) || '#6B7280' })) : [])
            .catch(() => [])
    );
    allItems = (await Promise.all(eventsPromises)).flat();
    const showDeclined = settings.showDeclined === true || settings.showDeclined === 'true';
    const excludedKeywordsStr = settings.excludedKeywords || '';
    const excludedKeywords = excludedKeywordsStr ? excludedKeywordsStr.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
    let filteredItems = allItems.filter(event => {
        if (!showDeclined) {
            const self = event.attendees?.find(a => a.self);
            if (self && self.responseStatus === 'declined') return false;
        }
        if (excludedKeywords.length > 0) {
            const subject = (event.summary || '').toLowerCase();
            if (excludedKeywords.some(keyword => subject.includes(keyword))) return false;
        }
        return true;
    });
    const uniqueEvents = Array.from(new Map(filteredItems.map(item => [item.id, item])).values());
    uniqueEvents.sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));
    const displayDateKeys = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        if (d.getDay() >= 1 && d.getDay() <= 5) {
            displayDateKeys.push(d.toISOString().split('T')[0]);
        }
    }
    return { upcomingEvents: uniqueEvents, displayDateKeys };
};