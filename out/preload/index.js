"use strict";
const { contextBridge, ipcRenderer, shell } = require("electron");
console.log("Preload: Shell object status:", typeof shell, shell);
contextBridge.exposeInMainWorld("electronAPI", {
  // General App APIs
  getPlugins: () => ipcRenderer.invoke("get-plugins"),
  // Global Settings APIs
  getGlobalSetting: (key) => ipcRenderer.invoke("db-get-global-setting", key),
  setGlobalSetting: (key, value) => ipcRenderer.invoke("db-set-global-setting", key, value),
  // Plugin Specific APIs
  getPluginSettings: (pluginId) => ipcRenderer.invoke("db-get-plugin-settings", pluginId),
  setPluginSetting: (pluginId, key, value) => ipcRenderer.invoke("db-set-plugin-setting", pluginId, key, value),
  regenerateTables: (pluginId) => ipcRenderer.invoke("plugin-regenerate-tables", pluginId),
  // Lottie Animation Data Getter
  getLottieAnimation: (pluginId, animationPath) => ipcRenderer.invoke("get-lottie-animation", pluginId, animationPath),
  // Plugin Database Query APIs (for custom plugin tables)
  dbRun: (pluginId, sql, params = []) => ipcRenderer.invoke("db-run-query", pluginId, sql, params),
  dbAll: (pluginId, sql, params = []) => ipcRenderer.invoke("db-all-query", pluginId, sql, params),
  // Database Manager APIs (Global)
  dbGetAllTables: () => ipcRenderer.invoke("db-get-all-tables"),
  dbGetTableContent: (tableName) => ipcRenderer.invoke("db-get-table-content", tableName),
  dbDropTable: (tableName) => ipcRenderer.invoke("db-drop-table", tableName),
  dbDeleteRow: (tableName, rowid) => ipcRenderer.invoke("db-delete-row", tableName, rowid),
  // Generic Plugin Service Call API (for plugin backend services)
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    const validChannels = ["auth-success", "auth-failure", "plugin-modal-request"];
    if (validChannels.includes(channel)) {
      const wrappedCallback = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, wrappedCallback);
      return () => ipcRenderer.removeListener(channel, wrappedCallback);
    }
  },
  "plugin:service-call": (payload) => ipcRenderer.invoke("plugin:service-call", payload),
  // NEW: IPC call to request main process to open a plugin-specific modal
  openPluginSpecificModal: (payload) => ipcRenderer.invoke("open-plugin-specific-modal", payload),
  // NEW: API for plugins to request showing a toast message in the main window
  showToast: (options) => ipcRenderer.send("show-toast-from-plugin", options),
  // ADDED: Open external link using Electron's shell module
  openExternalLink: (url) => shell.openExternal(url),
  // OS related APIs (now routed via main process for security)
  os: {
    hostname: () => ipcRenderer.invoke("get-os-hostname"),
    type: () => ipcRenderer.invoke("get-os-type"),
    platform: () => ipcRenderer.invoke("get-os-platform"),
    arch: () => ipcRenderer.invoke("get-os-arch"),
    release: () => ipcRenderer.invoke("get-os-release"),
    uptime: () => ipcRenderer.invoke("get-os-uptime"),
    loadavg: () => ipcRenderer.invoke("get-os-loadavg"),
    totalmem: () => ipcRenderer.invoke("get-os-totalmem"),
    freemem: () => ipcRenderer.invoke("get-os-freemem"),
    cpus: () => ipcRenderer.invoke("get-os-cpus"),
    networkInterfaces: () => ipcRenderer.invoke("get-os-network-interfaces")
  },
  /**
   * Allows any sandboxed plugin to require a Node.js module.
   * NOTE: This is generally discouraged for security in renderers.
   * Prefer using plugin backend services (`service.js`) or specific IPC calls.
   * This is kept for compatibility but its use should be minimized.
   * @param {string} moduleName - The name of the module to require.
   * @returns {any} The required module.
   */
  require: (moduleName) => {
    return require(moduleName);
  }
});
