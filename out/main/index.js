"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const sqlite3 = require("sqlite3");
const fs = require("fs");
const child_process = require("child_process");
const url = require("url");
const os = require("os");
const verboseSqlite3 = sqlite3.verbose();
const dbPath = path.join(process.cwd(), "command_center.db");
const db = new verboseSqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
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
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
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
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
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
async function initialize(plugins) {
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
  const result = await get("SELECT value FROM global_settings WHERE key = ?", [key]);
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
    const rows = await all(`SELECT key, value FROM ${tableName}`);
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch (err) {
    if (err.message.includes("no such table")) {
      console.warn(`Settings table for plugin ${pluginId} (${tableName}) does not exist yet. Returning empty settings.`);
      return {};
    }
    console.error(`Error getting plugin settings for ${pluginId}:`, err.message);
    throw err;
  }
}
async function setPluginSetting(pluginId, key, value) {
  const safeId = sanitizeForSQL$1(pluginId);
  const tableName = `plugin_${safeId}_settings`;
  try {
    await run(`CREATE TABLE IF NOT EXISTS ${tableName} (key TEXT PRIMARY KEY, value TEXT)`);
    return await run(`INSERT OR REPLACE INTO ${tableName} (key, value) VALUES (?, ?)`, [key, value]);
  } catch (err) {
    console.error(`Error saving plugin setting ${key} for ${pluginId}:`, err.message);
    throw err;
  }
}
async function getAllTables() {
  const rows = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  return rows.map((row) => row.name);
}
async function getTableContent(tableName) {
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error("Invalid table name.");
  }
  return await all(`SELECT rowid, * FROM ${tableName}`);
}
async function dropTable(tableName) {
  if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error("Invalid table name.");
  }
  return await run(`DROP TABLE IF EXISTS ${tableName}`);
}
async function deleteRow(tableName, rowid) {
  if (!tableName.match(/^[a-zA-Z0-9_]+$/) || typeof rowid !== "number" || rowid <= 0) {
    throw new Error("Invalid table name or row ID.");
  }
  return await run(`DELETE FROM ${tableName} WHERE rowid = ?`, [rowid]);
}
const db$1 = {
  db,
  // Keep direct db access for advanced queries if needed (like db.run/all within IPC handlers)
  run,
  get,
  all,
  initialize,
  getGlobalSetting,
  setGlobalSetting,
  getPluginSettings,
  // NEW: Specific function
  setPluginSetting,
  // NEW: Specific function
  getAllTables,
  // NEW: For DB management in settings
  getTableContent,
  // NEW: For DB management in settings
  dropTable,
  // NEW: For DB management in settings
  deleteRow
  // NEW: For DB management in settings
};
const pluginsDir = path.join(process.cwd(), "plugins");
async function loadPlugins() {
  const pluginFolders = await fs.promises.readdir(pluginsDir, { withFileTypes: true });
  const plugins = [];
  for (const dirent of pluginFolders) {
    if (dirent.isDirectory()) {
      const manifestPath = path.join(pluginsDir, dirent.name, "manifest.json");
      try {
        const manifestContent = await fs.promises.readFile(manifestPath, "utf-8");
        const manifest = JSON.parse(manifestContent);
        plugins.push({
          id: dirent.name,
          path: path.join(pluginsDir, dirent.name),
          manifest
        });
      } catch (error) {
        console.error(`Could not load plugin from ${dirent.name}:`, error);
      }
    }
  }
  return plugins;
}
function installDependencies(plugins) {
  return new Promise((resolve, reject) => {
    const dependencies = /* @__PURE__ */ new Set();
    plugins.forEach((plugin) => {
      if (plugin.manifest.dependencies) {
        Object.keys(plugin.manifest.dependencies).forEach((dep) => {
          try {
            require.resolve(dep);
          } catch (e) {
            dependencies.add(`${dep}@${plugin.manifest.dependencies[dep]}`);
          }
        });
      }
    });
    if (dependencies.size === 0) {
      console.log("All plugin dependencies are already satisfied.");
      return resolve(false);
    }
    const command = `npm install ${[...dependencies].join(" ")}`;
    console.log(`[PluginManager] Running installation: ${command}`);
    child_process.exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[PluginManager] Error installing plugin dependencies: ${error.message}`);
        if (stderr) {
          console.error(`[PluginManager] Stderr: ${stderr}`);
        }
        return reject(error);
      }
      console.log(`[PluginManager] Dependency installation stdout: ${stdout}`);
      if (stderr) {
        console.warn(`[PluginManager] Dependency installation stderr (might contain warnings): ${stderr}`);
      }
      resolve(true);
    });
  });
}
const pluginManager = { loadPlugins, installDependencies };
let mainWindow;
let allPlugins = [];
const pluginServices = {};
const sanitizeForSQL = (id) => id.replace(/-/g, "_");
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon: path.join(__dirname, "../../build/icon.png") } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webviewTag: true
    }
  });
  mainWindow.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    try {
      const url2 = new URL(params.src);
      const fsPath = process.platform === "win32" ? url2.pathname.slice(1) : url2.pathname;
      const pluginDir = path.dirname(fsPath);
      const plugin = allPlugins.find(
        (p) => path.normalize(p.path).toLowerCase() === path.normalize(pluginDir).toLowerCase()
      );
      if (plugin && plugin.manifest.service && !plugin.manifest.nodeIntegration) {
        console.log(`Configuring webview for service-based plugin (${plugin.id}): Forcing sandboxed environment.`);
        webPreferences.nodeIntegration = false;
        webPreferences.contextIsolation = true;
        webPreferences.preload = path.join(__dirname, "../preload/index.js");
      } else if (plugin && plugin.manifest.nodeIntegration) {
        console.log(`Configuring webview for nodeIntegration plugin: ${plugin.id}`);
        webPreferences.nodeIntegration = true;
        webPreferences.contextIsolation = false;
        delete webPreferences.preload;
      } else {
        console.log(`Configuring webview for standard plugin (${plugin ? plugin.id : "Unknown"}): secure preload.`);
        webPreferences.nodeIntegration = false;
        webPreferences.contextIsolation = true;
        webPreferences.preload = path.join(__dirname, "../preload/index.js");
      }
    } catch (e) {
      console.error("Error in will-attach-webview:", e);
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.preload = path.join(__dirname, "../preload/index.js");
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  console.log("App is ready. Initializing...");
  try {
    allPlugins = await pluginManager.loadPlugins();
    console.log(`Loaded ${allPlugins.length} plugins.`);
    await pluginManager.installDependencies(allPlugins);
    await db$1.initialize(allPlugins);
    console.log("Database initialized successfully.");
    for (const plugin of allPlugins) {
      if (plugin.manifest.service) {
        const servicePath = path.join(plugin.path, plugin.manifest.service);
        const serviceURL = url.pathToFileURL(servicePath).href;
        try {
          const serviceModule = await import(serviceURL);
          if (serviceModule.init) {
            pluginServices[plugin.id] = serviceModule;
            serviceModule.init(db$1, mainWindow);
          } else {
            console.warn(`[Main Process] Plugin service ${plugin.id} found at ${servicePath}, but no 'init' function exported.`);
          }
        } catch (serviceError) {
          console.error(`[Main Process] Failed to load or initialize service for plugin ${plugin.id} from ${servicePath}:`, serviceError);
        }
      }
    }
  } catch (error) {
    console.error("Failed during app initialization:", error);
  }
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.handle("get-plugins", async () => {
  const plugins = await pluginManager.loadPlugins();
  return plugins.map((plugin) => ({
    ...plugin,
    entryPointPath: `file://${path.join(plugin.path, plugin.manifest.entryPoint)}`
  }));
});
electron.ipcMain.handle("db-get-global-setting", async (_, key) => {
  return await db$1.getGlobalSetting(key);
});
electron.ipcMain.handle("db-set-global-setting", async (_, key, value) => {
  return await db$1.setGlobalSetting(key, value);
});
electron.ipcMain.handle("db-get-plugin-settings", async (_, pluginId) => {
  return await db$1.getPluginSettings(pluginId);
});
electron.ipcMain.handle("db-set-plugin-setting", async (_, pluginId, key, value) => {
  return await db$1.setPluginSetting(pluginId, key, value);
});
electron.ipcMain.handle("db-run-query", async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId);
  const tableNamePrefix = `plugin_${safeId}_`;
  if (!sql.includes(tableNamePrefix)) {
    throw new Error(`Query must target a table starting with '${tableNamePrefix}'`);
  }
  return await db$1.run(sql, params);
});
electron.ipcMain.handle("db-all-query", async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId);
  const tableNamePrefix = `plugin_${safeId}_`;
  if (!sql.includes(tableNamePrefix)) {
    throw new Error(`Query must target a table starting with '${tableNamePrefix}'`);
  }
  return await db$1.all(sql, params);
});
electron.ipcMain.handle("get-os-hostname", () => os.hostname());
electron.ipcMain.handle("get-os-type", () => os.type());
electron.ipcMain.handle("get-os-platform", () => os.platform());
electron.ipcMain.handle("get-os-arch", () => os.arch());
electron.ipcMain.handle("get-os-release", () => os.release());
electron.ipcMain.handle("get-os-uptime", () => os.uptime());
electron.ipcMain.handle("get-os-loadavg", () => os.loadavg());
electron.ipcMain.handle("get-os-totalmem", () => os.totalmem());
electron.ipcMain.handle("get-os-freemem", () => os.freemem());
electron.ipcMain.handle("get-os-cpus", () => os.cpus());
electron.ipcMain.handle("get-os-network-interfaces", () => os.networkInterfaces());
electron.ipcMain.handle("plugin:service-call", async (event, { pluginId, method, params }) => {
  const serviceModule = pluginServices[pluginId];
  if (!serviceModule) {
    throw new Error(`Service for plugin ${pluginId} not found.`);
  }
  const serviceFunction = serviceModule[method];
  if (typeof serviceFunction !== "function") {
    throw new Error(`Method "${method}" not found in plugin ${pluginId} service.`);
  }
  try {
    return await serviceFunction(params);
  } catch (error) {
    console.error(`[Main Process] Error calling service method ${pluginId}:${method}:`, error);
    throw error;
  }
});
electron.ipcMain.handle("open-plugin-specific-modal", (event, { pluginId, modalType }) => {
  const targetWebContents = electron.webContents.getAllWebContents().find((wc) => {
    if (wc.id === mainWindow.webContents.id) {
      return false;
    }
    const url2 = wc.getURL();
    if (url2.startsWith("file://")) {
      const fsPath = process.platform === "win32" ? url2.slice(8) : url2.slice(7);
      const pluginPath = allPlugins.find((p) => p.id === pluginId)?.path;
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
electron.ipcMain.handle("open-external-link", async (_, url2) => {
  try {
    await electron.shell.openExternal(url2);
    return { success: true };
  } catch (error) {
    console.error(`Error opening external link ${url2}:`, error);
    return { success: false, error: error.message };
  }
});
electron.ipcMain.handle("db-get-all-tables", async () => {
  return await db$1.getAllTables();
});
electron.ipcMain.handle("db-get-table-content", async (_, tableName) => {
  return await db$1.getTableContent(tableName);
});
electron.ipcMain.handle("db-drop-table", async (_, tableName) => {
  return await db$1.dropTable(tableName);
});
electron.ipcMain.handle("db-delete-row", async (_, tableName, rowid) => {
  return await db$1.deleteRow(tableName, rowid);
});
electron.ipcMain.handle("plugin-regenerate-tables", async (_, pluginId) => {
  const safeId = sanitizeForSQL(pluginId);
  const plugin = allPlugins.find((p) => p.id === pluginId);
  if (plugin && plugin.manifest.tables) {
    for (const tableDef of plugin.manifest.tables) {
      const tableName = `plugin_${safeId}_${tableDef.name}`;
      console.log(`Dropping table: ${tableName}`);
      await db$1.run(`DROP TABLE IF EXISTS ${tableName}`);
    }
    await db$1.run(`DROP TABLE IF EXISTS plugin_${safeId}_settings`);
  }
  electron.app.relaunch();
  electron.app.quit();
});
