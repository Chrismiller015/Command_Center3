// src/main/index.js
import { app, BrowserWindow, ipcMain, shell, webContents } from 'electron' 
import { join, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import db from './database.js'
import pluginManager from './pluginManager.js'
import path from 'path'
import { pathToFileURL } from 'url' 
import os from 'os'

let mainWindow;
let allPlugins = []; 
const pluginServices = {};

const sanitizeForSQL = (id) => id.replace(/-/g, '_');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // Keeping sandbox false for now as per your original file structure and explicit 'require' in preload
      nodeIntegration: false, // IMPORTANT: Set nodeIntegration to false for security and contextIsolation to work as expected
      contextIsolation: true, // IMPORTANT: Enable contextIsolation to properly expose APIs via contextBridge
      webviewTag: true
    }
  });

  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    try {
      const url = new URL(params.src);
      const fsPath = process.platform === 'win32' ? url.pathname.slice(1) : url.pathname;
      const pluginDir = dirname(fsPath);

      const plugin = allPlugins.find(p => 
        path.normalize(p.path).toLowerCase() === path.normalize(pluginDir).toLowerCase()
      );
      
      if (plugin && plugin.manifest.service && !plugin.manifest.nodeIntegration) {
          console.log(`Configuring webview for service-based plugin (${plugin.id}): Forcing sandboxed environment.`);
          webPreferences.nodeIntegration = false;
          webPreferences.contextIsolation = true;
          webPreferences.preload = join(__dirname, '../preload/index.js');
      } else if (plugin && plugin.manifest.nodeIntegration) {
          console.log(`Configuring webview for nodeIntegration plugin: ${plugin.id}`);
          webPreferences.nodeIntegration = true;
          webPreferences.contextIsolation = false;
          delete webPreferences.preload;
      } else {
          console.log(`Configuring webview for standard plugin (${plugin ? plugin.id : 'Unknown'}): secure preload.`);
          webPreferences.nodeIntegration = false;
          webPreferences.contextIsolation = true;
          webPreferences.preload = join(__dirname, '../preload/index.js');
      }
    } catch (e) {
        console.error("Error in will-attach-webview:", e);
        // Fallback to secure settings in case of error
        webPreferences.nodeIntegration = false;
        webPreferences.contextIsolation = true;
        webPreferences.preload = join(__dirname, '../preload/index.js');
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron');
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  console.log('App is ready. Initializing...');
  
  // FIX: Create the window first so the 'mainWindow' variable is valid for services
  createWindow();

  try {
    allPlugins = await pluginManager.loadPlugins();
    console.log(`Loaded ${allPlugins.length} plugins.`);
    
    await pluginManager.installDependencies(allPlugins);
    await db.initialize(allPlugins); 
    console.log('Database initialized successfully.');

    for (const plugin of allPlugins) {
        if (plugin.manifest.service) {
            const servicePath = path.join(plugin.path, plugin.manifest.service);
            const serviceURL = pathToFileURL(servicePath).href;
            try {
                const serviceModule = await import(serviceURL);
                if (serviceModule.init) {
                    pluginServices[plugin.id] = serviceModule;
                    // Now, 'mainWindow' will be a valid window object when passed
                    serviceModule.init(db, mainWindow); 
                } else {
                    console.warn(`[Main Process] Plugin service ${plugin.id} found at ${servicePath}, but no 'init' function exported.`);
                }
            } catch (serviceError) {
                console.error(`[Main Process] Failed to load or initialize service for plugin ${plugin.id} from ${servicePath}:`, serviceError);
            }
        }
    }

  } catch (error) {
    console.error('Failed during app initialization:', error);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// All IPC Handlers below are correct and unchanged
ipcMain.handle('get-plugins', async () => {
  const plugins = await pluginManager.loadPlugins();
  return plugins.map((plugin) => ({
    ...plugin,
    entryPointPath: `file://${join(plugin.path, plugin.manifest.entryPoint)}`
  }));
});

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

ipcMain.handle('db-run-query', async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId);
  const tableNamePrefix = `plugin_${safeId}_`;
  if (!sql.includes(tableNamePrefix)) {
    throw new Error(`Query must target a table starting with '${tableNamePrefix}'`);
  }
  return await db.run(sql, params);
});

ipcMain.handle('db-all-query', async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId);
  const tableNamePrefix = `plugin_${safeId}_`;
  if (!sql.includes(tableNamePrefix)) {
    throw new Error(`Query must target a table starting with '${tableNamePrefix}'`);
  }
  return await db.all(sql, params);
});

ipcMain.handle('get-os-hostname', () => os.hostname());
ipcMain.handle('get-os-type', () => os.type());
ipcMain.handle('get-os-platform', () => os.platform());
ipcMain.handle('get-os-arch', () => os.arch());
ipcMain.handle('get-os-release', () => os.release());
ipcMain.handle('get-os-uptime', () => os.uptime());
ipcMain.handle('get-os-loadavg', () => os.loadavg());
ipcMain.handle('get-os-totalmem', () => os.totalmem());
ipcMain.handle('get-os-freemem', () => os.freemem());
ipcMain.handle('get-os-cpus', () => os.cpus());
ipcMain.handle('get-os-network-interfaces', () => os.networkInterfaces());


ipcMain.handle('plugin:service-call', async (event, { pluginId, method, params }) => {
    const serviceModule = pluginServices[pluginId];
    if (!serviceModule) {
        throw new Error(`Service for plugin ${pluginId} not found.`);
    }
    const serviceFunction = serviceModule[method];
    if (typeof serviceFunction !== 'function') {
        throw new Error(`Method "${method}" not found in plugin ${pluginId} service.`);
    }
    try {
        return await serviceFunction(params); 
    } catch (error) {
        console.error(`[Main Process] Error calling service method ${pluginId}:${method}:`, error);
        throw error; 
    }
});

ipcMain.handle('open-plugin-specific-modal', (event, { pluginId, modalType }) => {
    const targetWebContents = webContents.getAllWebContents().find(wc => {
        if (wc.id === mainWindow.webContents.id) {
            return false;
        }
        const url = wc.getURL();
        if (url.startsWith('file://')) {
            const fsPath = process.platform === 'win32' ? url.slice(8) : url.slice(7); 
            const pluginPath = allPlugins.find(p => p.id === pluginId)?.path;
            if (pluginPath && path.normalize(fsPath).includes(path.normalize(pluginPath))) {
                return true;
            }
        }
        return false;
    });

    if (targetWebContents) {
        targetWebContents.send('plugin-modal-request', { modalType });
        console.log(`[Main] Sent 'plugin-modal-request' (${modalType}) to webview for plugin ${pluginId}`);
    } else {
        console.warn(`[Main] No webview found for plugin ${pluginId} to open modal ${modalType}.`);
    }
    return true; 
});

ipcMain.handle('open-external-link', async (_, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error(`Error opening external link ${url}:`, error);
        return { success: false, error: error.message };
    }
});

ipcMain.on('show-toast', (event, toastOptions) => {
    if (mainWindow) {
        mainWindow.webContents.send('show-toast', toastOptions);
    }
});

// NEW: Handle show-toast-from-plugin event
ipcMain.on('show-toast-from-plugin', (event, toastOptions) => {
    if (mainWindow) {
        mainWindow.webContents.send('show-toast', toastOptions);
    }
});

ipcMain.handle('db-get-all-tables', async () => {
    return await db.getAllTables();
});

ipcMain.handle('db-get-table-content', async (_, tableName) => {
    return await db.getTableContent(tableName);
});

ipcMain.handle('db-drop-table', async (_, tableName) => {
    return await db.dropTable(tableName);
});

ipcMain.handle('db-delete-row', async (_, tableName, rowid) => {
    return await db.deleteRow(tableName, rowid);
});


ipcMain.handle('plugin-regenerate-tables', async (_, pluginId) => {
  const safeId = sanitizeForSQL(pluginId);
  const plugin = allPlugins.find((p) => p.id === pluginId);
  if (plugin && plugin.manifest.tables) {
    for (const tableDef of plugin.manifest.tables) {
      const tableName = `plugin_${safeId}_${tableDef.name}`;
      console.log(`Dropping table: ${tableName}`);
      await db.run(`DROP TABLE IF EXISTS ${tableName}`);
    }
    await db.run(`DROP TABLE IF EXISTS plugin_${safeId}_settings`);
  }
  app.relaunch();
  app.quit();
});