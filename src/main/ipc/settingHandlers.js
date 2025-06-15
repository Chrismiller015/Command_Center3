import { ipcMain } from 'electron';
import db from '../database.js'; // Assuming database.js is in the parent directory

/**
 * Registers IPC handlers for global and plugin settings.
 */
export function registerSettingsHandlers() {
  ipcMain.handle('db-get-global-setting', async (_, key) => {
    return await db.getGlobalSetting(key);
  });

  ipcMain.handle('db-set-global-setting', async (_, key, value) => {
    return await db.setGlobalSetting(key, value);
  });

  ipcMain.handle('db-get-plugin-settings', async (_, pluginId) => {
    return await db.getPluginSettings(pluginId);
  });

  ipcMain.handle('db-set-plugin-setting', async (_, pluginId, key, value) => {
    return await db.setPluginSetting(pluginId, key, value);
  });
}