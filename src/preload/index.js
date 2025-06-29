import { contextBridge, ipcRenderer } from 'electron';

// Diagnostic: Log to the main process console (your terminal) to confirm this script is loading.
console.log('[Preload] Preload script has loaded successfully.');

if (process.contextIsolated) {
  try {
    // Main API for all plugin frontends AND the main application shell
    contextBridge.exposeInMainWorld('electronAPI', {
      // Moved from 'electron' object: Function for the main app to get the webview preload path.
      getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),

      // === Getters ===
      getPlugins: () => ipcRenderer.invoke('get-plugins'),
      getGlobalSetting: (key) => ipcRenderer.invoke('db-get-global-setting', key),
      getPluginSettings: (pluginId) => ipcRenderer.invoke('db-get-plugin-settings', pluginId),
      getAllTables: () => ipcRenderer.invoke('db-get-all-tables'),
      getTableContent: (tableName) => ipcRenderer.invoke('db-get-table-content', tableName),
      getOSInfo: (infoType) => ipcRenderer.invoke('get-os-info', infoType),

      // === Setters ===
      setGlobalSetting: (key, value) => ipcRenderer.invoke('db-set-global-setting', { key, value }),
      setPluginSetting: (pluginId, key, value) => ipcRenderer.invoke('db-set-plugin-setting', { pluginId, key, value }),

      // === Actions ===
      deleteRow: (tableName, rowid) => ipcRenderer.invoke('db-delete-row', { tableName, rowid }),
      dropTable: (tableName) => ipcRenderer.invoke('db-drop-table', tableName),
      regeneratePluginTables: (pluginId) => ipcRenderer.invoke('plugin-regenerate-tables', pluginId),
      openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
      copyToClipboard: (data, format) => ipcRenderer.invoke('copy-to-clipboard', { data, format }),

      // === Dialogs ===
      showConfirmationDialog: (options) => ipcRenderer.invoke('show-confirmation-dialog', options),
      showErrorDialog: (options) => ipcRenderer.invoke('show-error-dialog', options),
      showInfoDialog: (options) => ipcRenderer.invoke('show-info-dialog', options),
      showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
      showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

      // === Notifications & Toasts ===
      showNotification: (options) => ipcRenderer.invoke('show-notification', options),
      onShowToast: (callback) => {
        const listener = (event, options) => callback(options);
        ipcRenderer.on('show-toast', listener);
        // Return a cleanup function to be called on component unmount
        return () => {
          ipcRenderer.removeListener('show-toast', listener);
        };
      },

      // === Plugin Specific Calls ===
      callPluginService: (pluginId, method, params) => ipcRenderer.invoke('plugin:service-call', { pluginId, method, params }),
    });
  } catch (error) {
    console.error('[Preload] Error exposing APIs via contextBridge:', error);
  }
} else {
    console.error('[Preload] Context Isolation is disabled. This is a security risk and may cause errors.');
}