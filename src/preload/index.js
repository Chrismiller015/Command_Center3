const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('electronAPI', {
  // General App APIs
  getPlugins: () => ipcRenderer.invoke('get-plugins'),
  
  // Global Settings APIs
  getGlobalSetting: (key) => ipcRenderer.invoke('db-get-global-setting', key),
  setGlobalSetting: (key, value) => ipcRenderer.invoke('db-set-global-setting', key, value),

  // Plugin Specific APIs
  getPluginSettings: (pluginId) => ipcRenderer.invoke('db-get-plugin-settings', pluginId),
  setPluginSetting: (pluginId, key, value) => ipcRenderer.invoke('db-set-plugin-setting', pluginId, key, value),
  regenerateTables: (pluginId) => ipcRenderer.invoke('plugin-regenerate-tables', pluginId),
  
  // Lottie Animation Data Getter
  getLottieAnimation: (pluginId, animationPath) => ipcRenderer.invoke('get-lottie-animation', pluginId, animationPath),
  
  // Plugin Database Query APIs
  dbRun: (pluginId, sql, params = []) => ipcRenderer.invoke('db-run-query', pluginId, sql, params),
  dbAll: (pluginId, sql, params = []) => ipcRenderer.invoke('db-all-query', pluginId, sql, params),

  // Exposing Node Modules (As requested for full access)
  os: {
    hostname: () => os.hostname(),
    type: () => os.type(),
    platform: () => os.platform(),
    arch: () => os.arch(),
    release: () => os.release(),
    uptime: () => os.uptime(),
    loadavg: () => os.loadavg(),
    totalmem: () => os.totalmem(),
    freemem: () => os.freemem(),
    cpus: () => os.cpus(),
    networkInterfaces: () => os.networkInterfaces(),
  },

  /**
   * Allows any sandboxed plugin to require a Node.js module.
   * @param {string} moduleName - The name of the module to require (e.g., 'fs', 'path', 'googleapis').
   * @returns {any} The required module.
   */
  require: (moduleName) => {
    // For security in a multi-user app, you might whitelist modules here.
    // For your use case, directly requiring is perfect.
    return require(moduleName);
  }
});