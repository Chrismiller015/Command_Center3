"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
require("child_process");
const sqlite3 = require("sqlite3");
const os = require("os");
const icon = path.join(__dirname, "../../resources/icon.png");
const pluginsDir = path.join(process.cwd(), "plugins");
let loadedPlugins = [];
const pluginServices = /* @__PURE__ */ new Map();
async function loadPluginService(plugin) {
  const servicePath = path.join(plugin.path, "service", "index.mjs");
  try {
    const serviceModule = await import(`file://${servicePath}`);
    pluginServices.set(plugin.id, serviceModule);
    console.log(`[PluginManager] Service loaded for plugin: ${plugin.id}`);
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") {
      console.error(`[PluginManager] Error loading service for plugin ${plugin.id}:`, error);
    }
  }
}
async function loadPlugins() {
  const pluginFolders = await fs.promises.readdir(pluginsDir, { withFileTypes: true });
  const plugins = [];
  pluginServices.clear();
  for (const dirent of pluginFolders) {
    if (dirent.isDirectory()) {
      const manifestPath = path.join(pluginsDir, dirent.name, "manifest.json");
      try {
        const manifestContent = await fs.promises.readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(manifestContent);
        const plugin = {
          id: dirent.name,
          path: path.join(pluginsDir, dirent.name),
          manifest
        };
        plugins.push(plugin);
        await loadPluginService(plugin);
      } catch (error) {
        console.error(`Could not load plugin from ${dirent.name}:`, error);
      }
    }
  }
  loadedPlugins = plugins;
  return loadedPlugins;
}
function getPlugins() {
  return loadedPlugins;
}
function getPluginServices() {
  return pluginServices;
}
const verboseSqlite3 = sqlite3.verbose();
const dbPath = path.join(electron.app.getPath("userData"), "command_center.db");
let dbInstance;
function getDB() {
  if (!dbInstance) {
    throw new Error("Database has not been initialized. Call initializeDatabase first.");
  }
  return dbInstance;
}
function connectToDatabase() {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new verboseSqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error opening database", err.message);
        return reject(err);
      }
      console.log("Connected to the SQLite database.");
      resolve();
    });
  });
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function(err) {
      if (err) {
        console.error("Error running sql " + sql);
        console.error(err);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}
function get$1(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, result) => {
      if (err) {
        console.error("Error running sql: " + sql);
        console.error(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
function all$1(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) {
        console.error("Error running sql: " + sql);
        console.error(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
const sanitizeForSQL$1 = (id) => id.replace(/-/g, "_");
async function initializeDatabase(plugins = []) {
  if (!dbInstance) {
    await connectToDatabase();
  }
  await run(`
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  for (const plugin of plugins) {
    const safeId = sanitizeForSQL$1(plugin.id);
    await run(`
        CREATE TABLE IF NOT EXISTS plugin_${safeId}_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);
    if (plugin.manifest.tables && Array.isArray(plugin.manifest.tables)) {
      for (const tableDef of plugin.manifest.tables) {
        const tableName = `plugin_${safeId}_${tableDef.name}`;
        const columns = tableDef.columns.map((col) => `${col.name} ${col.type}`).join(", ");
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
        await run(createTableSql);
      }
    }
  }
}
async function getGlobalSetting(key) {
  const result = await get$1("SELECT value FROM global_settings WHERE key = ?", [key]);
  return result ? result.value : null;
}
async function setGlobalSetting(key, value) {
  return await run("INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)", [
    key,
    value
  ]);
}
async function getPluginSettings(pluginId) {
  const safeId = sanitizeForSQL$1(pluginId);
  const tableName = `plugin_${safeId}_settings`;
  try {
    const rows = await all$1(`SELECT key, value FROM ${tableName}`);
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch (err) {
    if (err.message.includes("no such table")) {
      console.warn(`Settings table for plugin ${pluginId} not found. Returning empty settings.`);
      return {};
    }
    console.error(`Error getting plugin settings for ${pluginId}:`, err.message);
    throw err;
  }
}
async function setPluginSetting(pluginId, key, value) {
  const safeId = sanitizeForSQL$1(pluginId);
  const tableName = `plugin_${safeId}_settings`;
  return await run(`INSERT OR REPLACE INTO ${tableName} (key, value) VALUES (?, ?)`, [key, value]);
}
async function getAllTables() {
  const rows = await all$1("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  return rows.map((row) => row.name);
}
async function getTableContent(tableName) {
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error("Invalid table name.");
  }
  return await all$1(`SELECT rowid, * FROM ${tableName}`);
}
async function dropTable(tableName) {
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error("Invalid table name.");
  }
  return await run(`DROP TABLE IF EXISTS ${tableName}`);
}
async function deleteRow(tableName, rowid) {
  if (!tableName.match(/^[a-zA-Z0-9_]+$/) || typeof rowid !== "number" && typeof rowid !== "string") {
    throw new Error("Invalid table name or row ID.");
  }
  return await run(`DELETE FROM ${tableName} WHERE rowid = ?`, [rowid]);
}
function registerSettingsHandlers() {
  electron.ipcMain.handle("db-get-global-setting", async (_, key) => {
    if (!key) {
      throw new Error("A key must be provided to get a global setting.");
    }
    return await getGlobalSetting(key);
  });
  electron.ipcMain.handle("db-set-global-setting", async (_, { key, value }) => {
    if (!key) {
      throw new Error("A key must be provided to set a global setting.");
    }
    return await setGlobalSetting(key, value);
  });
  electron.ipcMain.handle("db-get-plugin-settings", async (_, pluginId) => {
    if (!pluginId) {
      throw new Error("A pluginId must be provided to get plugin settings.");
    }
    return await getPluginSettings(pluginId);
  });
  electron.ipcMain.handle("db-set-plugin-setting", async (_, { pluginId, key, value }) => {
    if (!pluginId || !key) {
      throw new Error("A pluginId and key must be provided to set a plugin setting.");
    }
    return await setPluginSetting(pluginId, key, value);
  });
}
const sanitizeForSQL = (id) => id.replace(/-/g, "_");
function registerDatabaseHandlers() {
  electron.ipcMain.handle("db-run-query", async (_, { pluginId, sql, params }) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(" from plugin_") && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return run(sql, params);
  });
  electron.ipcMain.handle("db-get-query", async (_, { pluginId, sql, params }) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(" from plugin_") && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return get(sql, params);
  });
  electron.ipcMain.handle("db-all-query", async (_, { pluginId, sql, params }) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(" from plugin_") && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return all(sql, params);
  });
  electron.ipcMain.handle("db-get-all-tables", () => getAllTables());
  electron.ipcMain.handle("db-get-table-content", (_, tableName) => getTableContent(tableName));
  electron.ipcMain.handle("db-drop-table", (_, tableName) => dropTable(tableName));
  electron.ipcMain.handle("db-delete-row", (_, { tableName, rowid }) => deleteRow(tableName, rowid));
  electron.ipcMain.handle("plugin-regenerate-tables", async (_, pluginId) => {
    console.log(`[Main Process] Regenerating tables for plugin: ${pluginId}`);
    try {
      const allPlugins = getPlugins();
      const pluginToRegenerate = allPlugins.find((p) => p.id === pluginId);
      if (pluginToRegenerate) {
        console.warn("Regeneration logic needs to be fully implemented.");
        const safePluginId = sanitizeForSQL(pluginId);
        if (pluginToRegenerate.manifest.tables && Array.isArray(pluginToRegenerate.manifest.tables)) {
          for (const tableDef of pluginToRegenerate.manifest.tables) {
            const tableName = `plugin_${safePluginId}_${tableDef.name}`;
            console.log(`[Main Process] Dropping custom plugin table: ${tableName}`);
            await dropTable(tableName);
          }
        }
        console.log(`[Main Process] Tables for ${pluginId} have been processed for regeneration. Restarting app...`);
        electron.app.relaunch();
        electron.app.exit();
      } else {
        throw new Error(`Plugin ${pluginId} not found for regeneration.`);
      }
    } catch (error) {
      console.error(`Error regenerating tables for ${pluginId}:`, error);
      throw error;
    }
  });
}
function registerDialogHandlers(mainWindowRef) {
  electron.ipcMain.handle("show-confirmation-dialog", async (event, title, message) => {
    const result = await electron.dialog.showMessageBox(electron.BrowserWindow.fromWebContents(event.sender), {
      type: "question",
      buttons: ["Yes", "No"],
      defaultId: 1,
      // 'No' is default
      title,
      message
    });
    return result.response === 0;
  });
  electron.ipcMain.handle("show-error-dialog", async (event, title, message) => {
    await electron.dialog.showErrorBox(title, message);
  });
  electron.ipcMain.handle("show-info-dialog", async (event, title, message) => {
    await electron.dialog.showMessageBox(electron.BrowserWindow.fromWebContents(event.sender), {
      type: "info",
      title,
      message
    });
  });
  electron.ipcMain.handle("show-open-dialog", async (event, options) => {
    const result = await electron.dialog.showOpenDialog(electron.BrowserWindow.fromWebContents(event.sender), options);
    return result;
  });
  electron.ipcMain.handle("show-save-dialog", async (event, options) => {
    const result = await electron.dialog.showSaveDialog(electron.BrowserWindow.fromWebContents(event.sender), options);
    return result;
  });
}
function registerClipboardHandler() {
  electron.ipcMain.handle("write-to-clipboard", async (event, { format, data }) => {
    if (format === "html") {
      electron.clipboard.writeHTML(data);
      electron.clipboard.writeText(data);
    } else if (format === "rtf") {
      electron.clipboard.write({
        text: data,
        // Fallback plain text is good practice
        rtf: data
      });
      console.log("Attempted to write RTF to clipboard.");
    } else {
      electron.clipboard.writeText(data);
    }
    return true;
  });
}
function registerNotificationHandler() {
  electron.ipcMain.handle("show-system-notification", async (event, { title, body }) => {
    if (electron.Notification.isSupported()) {
      new electron.Notification({ title, body }).show();
    } else {
      console.warn("System notifications are not supported on this platform.");
    }
  });
}
function registerOsHandlers() {
  electron.ipcMain.handle("get-os-info", (event, infoType) => {
    try {
      switch (infoType) {
        case "hostname":
          return os.hostname();
        case "type":
          return os.type();
        case "platform":
          return os.platform();
        case "arch":
          return os.arch();
        case "release":
          return os.release();
        case "uptime":
          return os.uptime();
        case "loadavg":
          return os.loadavg();
        case "totalmem":
          return os.totalmem();
        case "freemem":
          return os.freemem();
        case "cpus":
          return os.cpus();
        case "networkInterfaces":
          return os.networkInterfaces();
        default:
          console.warn(`Attempted to access invalid OS info type: ${infoType}`);
          throw new Error(`Invalid OS info type requested: ${infoType}`);
      }
    } catch (error) {
      console.error(`Error fetching OS info for type '${infoType}':`, error);
      throw error;
    }
  });
}
function registerIpcHandlers(mainWindowRef, pluginServicesRef, allPluginsRef) {
  registerSettingsHandlers();
  registerDatabaseHandlers();
  registerDialogHandlers();
  registerClipboardHandler();
  registerNotificationHandler();
  registerOsHandlers();
  electron.ipcMain.handle("get-preload-path", () => {
    return path.join(__dirname, "..", "preload", "index.js");
  });
  electron.ipcMain.handle("plugin:service-call", async (event, { pluginId, method, params }) => {
    const serviceModule = pluginServicesRef.get(pluginId);
    if (!serviceModule) {
      console.error(`[IPC] Service for plugin "${pluginId}" not found for method "${method}".`);
      throw new Error(`Service for plugin "${pluginId}" not found.`);
    }
    const serviceFunction = serviceModule.default && typeof serviceModule.default[method] === "function" ? serviceModule.default[method] : serviceModule[method];
    if (typeof serviceFunction !== "function") {
      console.error(`[IPC] Method "${method}" not found or not a function in plugin "${pluginId}" service.`);
      throw new Error(`Method "${method}" not found in plugin "${pluginId}" service.`);
    }
    try {
      return await serviceFunction(params);
    } catch (error) {
      console.error(`[IPC] Error calling service method ${pluginId}:${method}:`, error);
      throw error;
    }
  });
  electron.ipcMain.handle("open-plugin-specific-modal", (event, { pluginId, modalType }) => {
    const targetWebContents = electron.webContents.getAllWebContents().find((wc) => {
      if (wc.id === mainWindowRef.webContents.id) {
        return false;
      }
      const url = wc.getURL();
      if (url.startsWith("file://")) {
        const fsPath = process.platform === "win32" ? url.slice(8) : url.slice(7);
        const pluginPath = allPluginsRef.find((p) => p.id === pluginId)?.path;
        if (pluginPath && path.normalize(fsPath).includes(path.normalize(pluginPath))) {
          return true;
        }
      }
      return false;
    });
    if (targetWebContents) {
      targetWebContents.send("plugin-modal-request", { modalType });
      console.log(`[Main] Sent 'plugin-modal-request' (${modalType}) to webview for plugin ${pluginId}`);
    } else {
      console.warn(`[Main] No webview found for plugin ${pluginId} to open modal ${modalType}.`);
    }
    return true;
  });
  electron.ipcMain.handle("open-external-link", async (_, url) => {
    try {
      await electron.shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error(`Error opening external link ${url}:`, error);
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.on("show-toast", (event, toastOptions) => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send("show-toast", toastOptions);
    }
  });
  electron.ipcMain.on("show-toast-from-plugin", (event, toastOptions) => {
    if (mainWindowRef) {
      mainWindowRef.webContents.send("show-toast", toastOptions);
    }
  });
}
let mainWindow;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true,
      // *** FIX: This line is critical for the preload script to work correctly ***
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (utils.is.dev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  utils.electronApp.setAppUserModelId("com.electron.commandcenter");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  try {
    const loadedPlugins2 = await loadPlugins();
    await initializeDatabase(loadedPlugins2);
    createWindow();
    registerIpcHandlers(mainWindow, getPluginServices(), getPlugins());
    electron.ipcMain.handle("get-plugins", () => {
      return getPlugins();
    });
  } catch (error) {
    console.error("Failed during app initialization:", error);
    electron.app.quit();
    return;
  }
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
