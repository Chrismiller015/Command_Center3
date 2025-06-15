console.log('[Calendar Plugin] main.js loaded and executing.'); // ADD THIS LINE AT THE VERY TOP

import * as api from './api.js';
import * as dom from './dom.js';
import * as modals from './modals.js';
import * as views from './views.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Calendar Plugin] DOM is fully loaded.');

    let refreshInterval;
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

    function attachEventListeners() {
        document.body.addEventListener('click', (event) => {
            const targetId = event.target.id;
            switch (targetId) {
                case 'save-credentials-button':
                    dom.showMessage('Saving credentials and initiating authentication...');
                    const clientId = document.getElementById('client-id').value.trim();
                    const clientSecret = document.getElementById('client-secret').value.trim();
                    Promise.all([
                        api.setPluginSetting('googleClientId', clientId),
                        api.setPluginSetting('googleClientSecret', clientSecret)
                    ]).then(() => {
                        api.saveCredentialsAndGetAuthUrl().catch(err => dom.showMessage(err.message, true));
                    });
                    break;
                case 'details-modal-close-btn':
                    modals.closeModal('details-modal');
                    break;
                case 'calendars-modal-close-btn':
                    modals.closeModal('calendars-modal');
                    break;
                case 'confirm-cancel-btn':
                    modals.closeModal('confirmation-modal');
                    break;
            }
        });

        // Listen for the custom refresh event dispatched by the modals
        document.body.addEventListener('calendar-needs-refresh', () => {
            console.log("Refresh request received from a modal.");
            views.loadCalendar();
        });

        window.electronAPI.on('plugin-modal-request', ({ modalType }) => {
            if (modalType === 'calendars-modal') modals.openCalendarsModal();
        });
        window.electronAPI.on('auth-success', () => {
            dom.showMessage('Authentication successful! Reloading...');
            setTimeout(() => window.location.reload(), 1000);
        });
        window.electronAPI.on('auth-failure', ({ error }) => {
            dom.showMessage(error, true);
        });
    }

    async function init() {
        try {
            const status = await api.checkAuthStatus();
            if (status.isConfigured && status.isAuthenticated) {
                await views.loadCalendar();
                if (refreshInterval) clearInterval(refreshInterval);
                refreshInterval = setInterval(views.loadCalendar, REFRESH_INTERVAL_MS);
            } else if (status.isConfigured && !status.isAuthenticated) {
                dom.showMessage('Credentials found. Please complete the sign-in process in your browser...');
                api.saveCredentialsAndGetAuthUrl().catch(err => dom.showMessage(err.message, true));
            } else {
                dom.switchView('auth-view');
            }
        } catch (e) {
            dom.showMessage(e.message, true);
        }
    }

    attachEventListeners();
    init();
});