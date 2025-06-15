import { ipcMain } from 'electron';
import {
  getGlobalSetting,
  setGlobalSetting,
  getPluginSettings,
  setPluginSetting
} from '../database.js';

/**
 * Registers IPC handlers for getting and setting global and plugin-specific settings.
 */
export function registerSettingsHandlers() {
  // FIX: Added 'db-' prefix to match what the renderer is calling.
  ipcMain.handle('db-get-global-setting', async (_, key) => {
    if (!key) {
      throw new Error('A key must be provided to get a global setting.');
    }
    return await getGlobalSetting(key);
  });

  // FIX: Added 'db-' prefix.
  ipcMain.handle('db-set-global-setting', async (_, { key, value }) => {
    if (!key) {
      throw new Error('A key must be provided to set a global setting.');
    }
    return await setGlobalSetting(key, value);
  });

  // FIX: Added 'db-' prefix.
  ipcMain.handle('db-get-plugin-settings', async (_, pluginId) => {
    if (!pluginId) {
      throw new Error('A pluginId must be provided to get plugin settings.');
    }
    return await getPluginSettings(pluginId);
  });

  // FIX: Added 'db-' prefix.
  ipcMain.handle('db-set-plugin-setting', async (_, { pluginId, key, value }) => {
    if (!pluginId || !key) {
      throw new Error('A pluginId and key must be provided to set a plugin setting.');
    }
    return await setPluginSetting(pluginId, key, value);
  });
}