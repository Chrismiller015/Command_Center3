"use strict";
const electron = require("electron");
console.log("[Preload] Preload script has loaded successfully.");
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electronAPI", {
      // Moved from 'electron' object: Function for the main app to get the webview preload path.
      getPreloadPath: () => electron.ipcRenderer.invoke("get-preload-path"),
      // === Getters ===
      getPlugins: () => electron.ipcRenderer.invoke("get-plugins"),
      getGlobalSetting: (key) => electron.ipcRenderer.invoke("db-get-global-setting", key),
      getPluginSettings: (pluginId) => electron.ipcRenderer.invoke("db-get-plugin-settings", pluginId),
      getAllTables: () => electron.ipcRenderer.invoke("db-get-all-tables"),
      getTableContent: (tableName) => electron.ipcRenderer.invoke("db-get-table-content", tableName),
      getOSInfo: (infoType) => electron.ipcRenderer.invoke("get-os-info", infoType),
      // === Setters ===
      setGlobalSetting: (key, value) => electron.ipcRenderer.invoke("db-set-global-setting", { key, value }),
      setPluginSetting: (pluginId, key, value) => electron.ipcRenderer.invoke("db-set-plugin-setting", { pluginId, key, value }),
      // === Actions ===
      deleteRow: (tableName, rowid) => electron.ipcRenderer.invoke("db-delete-row", { tableName, rowid }),
      dropTable: (tableName) => electron.ipcRenderer.invoke("db-drop-table", tableName),
      regeneratePluginTables: (pluginId) => electron.ipcRenderer.invoke("plugin-regenerate-tables", pluginId),
      openExternalLink: (url) => electron.ipcRenderer.invoke("open-external-link", url),
      copyToClipboard: (data, format) => electron.ipcRenderer.invoke("copy-to-clipboard", { data, format }),
      // === Dialogs ===
      showConfirmationDialog: (options) => electron.ipcRenderer.invoke("show-confirmation-dialog", options),
      showErrorDialog: (options) => electron.ipcRenderer.invoke("show-error-dialog", options),
      showInfoDialog: (options) => electron.ipcRenderer.invoke("show-info-dialog", options),
      showOpenDialog: (options) => electron.ipcRenderer.invoke("show-open-dialog", options),
      showSaveDialog: (options) => electron.ipcRenderer.invoke("show-save-dialog", options),
      // === Notifications & Toasts ===
      showNotification: (options) => electron.ipcRenderer.invoke("show-notification", options),
      onShowToast: (callback) => {
        const listener = (event, options) => callback(options);
        electron.ipcRenderer.on("show-toast", listener);
        return () => {
          electron.ipcRenderer.removeListener("show-toast", listener);
        };
      },
      // === Plugin Specific Calls ===
      callPluginService: (pluginId, method, params) => electron.ipcRenderer.invoke("plugin:service-call", { pluginId, method, params })
    });
  } catch (error) {
    console.error("[Preload] Error exposing APIs via contextBridge:", error);
  }
} else {
  console.error("[Preload] Context Isolation is disabled. This is a security risk and may cause errors.");
}
