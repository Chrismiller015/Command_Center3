"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const sqlite3 = require("sqlite3");
const fs = require("fs");
const child_process = require("child_process");
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
const db$1 = {
  db,
  run,
  get,
  all,
  initialize,
  getGlobalSetting,
  setGlobalSetting
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
          dependencies.add(`${dep}@${plugin.manifest.dependencies[dep]}`);
        });
      }
    });
    if (dependencies.size === 0) {
      console.log("No new plugin dependencies to install.");
      return resolve();
    }
    const command = `npm install ${[...dependencies].join(" ")}`;
    console.log(`Running installation: ${command}`);
    child_process.exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing plugin dependencies: ${error}`);
        return reject(error);
      }
      console.log(`Dependency installation stdout: ${stdout}`);
      if (stderr) console.error(`Dependency installation stderr: ${stderr}`);
      resolve();
    });
  });
}
const pluginManager = { loadPlugins, installDependencies };
let mainWindow;
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
    webPreferences.preload = path.join(__dirname, "../preload/index.js");
    webPreferences.sandbox = false;
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
    const plugins = await pluginManager.loadPlugins();
    console.log(`Loaded ${plugins.length} plugins.`);
    await pluginManager.installDependencies(plugins);
    await db$1.initialize(plugins);
    console.log("Database initialized successfully.");
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
  const safeId = sanitizeForSQL(pluginId);
  const settings = await db$1.all(`SELECT * FROM plugin_${safeId}_settings`);
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
});
electron.ipcMain.handle("db-set-plugin-setting", async (_, pluginId, key, value) => {
  const safeId = sanitizeForSQL(pluginId);
  return await db$1.run(
    `INSERT OR REPLACE INTO plugin_${safeId}_settings (key, value) VALUES (?, ?)`,
    [key, value]
  );
});
electron.ipcMain.handle("db-run-query", async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId);
  const tableName = `plugin_${safeId}_`;
  if (!sql.includes(tableName)) {
    throw new Error(`Query must target a table starting with '${tableName}'`);
  }
  return await db$1.run(sql, params);
});
electron.ipcMain.handle("db-all-query", async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId);
  const tableName = `plugin_${safeId}_`;
  if (!sql.includes(tableName)) {
    throw new Error(`Query must target a table starting with '${tableName}'`);
  }
  return await db$1.all(sql, params);
});
electron.ipcMain.handle("plugin-regenerate-tables", async (_, pluginId) => {
  const safeId = sanitizeForSQL(pluginId);
  const plugin = (await pluginManager.loadPlugins()).find((p) => p.id === pluginId);
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
