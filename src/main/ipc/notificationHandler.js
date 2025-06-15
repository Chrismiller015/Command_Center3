import { ipcMain, Notification } from 'electron';

/**
 * Registers IPC handler for system notifications.
 */
export function registerNotificationHandler() {
  ipcMain.handle('show-system-notification', async (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    } else {
      console.warn('System notifications are not supported on this platform.');
    }
  });
}