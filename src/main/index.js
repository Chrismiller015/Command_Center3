// src/main/index.js
import { app, BrowserWindow, ipcMain, shell, webContents } from 'electron'; // Keep necessary Electron imports
import { join, dirname } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import db from './database.js';
import pluginManager from './pluginManager.js';
import path from 'path';
import { pathToFileURL } from 'url'; 
// Import the central IPC handler registration function
import { registerIpcHandlers } from './ipc/index.js'; // NEW IMPORT

let mainWindow;
let allPlugins = []; 
const pluginServices = new Map();

const sanitizeForSQL = (id) => id.replace(/-/g, '_'); // This can stay here or be moved if needed elsewhere

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
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
      
      if (plugin && plugin.manifest.serviceEntry && !plugin.manifest.nodeIntegration) {
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
  
  createWindow();

  // Register all IPC handlers, passing mainWindow and pluginServices Map
  registerIpcHandlers(mainWindow, pluginServices); // NEW: Call the consolidated handler registration

  try {
    allPlugins = await pluginManager.loadPlugins();
    console.log(`Loaded ${allPlugins.length} plugins.`);
    
    await pluginManager.installDependencies(allPlugins);
    await db.initialize(allPlugins); 
    console.log('Database initialized successfully.');

    for (const plugin of allPlugins) {
      if (plugin.manifest.serviceEntry) {
        const servicePath = path.join(plugin.path, plugin.manifest.serviceEntry);
        const serviceURL = pathToFileURL(servicePath).href;
        try {
            const serviceModule = await import(serviceURL);
            const serviceApi = serviceModule.default || serviceModule; 

            if (serviceApi.init && typeof serviceApi.init === 'function') {
                await serviceApi.init(db, mainWindow); 
            }
            pluginServices.set(plugin.id, serviceApi); 
            console.log(`[Main Process] Loaded service for plugin: ${plugin.id}`);
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

// REMOVED ALL IPC HANDLERS FROM HERE - THEY ARE NOW IN src/main/ipc/*
// The specific ones (get-plugins, open-plugin-specific-modal, show-toast, open-external-link)
// are moved into src/main/ipc/index.js where registerIpcHandlers is defined
// and will need proper referencing of allPlugins, mainWindow, webContents, shell there.

// Moved plugin-regenerate-tables handler to databaseHandlers.js
// Moved show-confirmation-dialog, show-error-dialog, show-info-dialog to dialogHandlers.js
// Moved show-open-dialog, show-save-dialog to dialogHandlers.js
// Moved write-to-clipboard to clipboardHandler.js
// Moved show-system-notification to notificationHandler.js
// Moved os.* handlers to osHandlers.js

// The handlers for 'get-plugins', 'open-plugin-specific-modal', 'show-toast', 'open-external-link',
// and 'show-toast-from-plugin' need to be added to src/main/ipc/index.js,
// and correctly use `mainWindowRef` and `allPlugins` which will be passed to `registerIpcHandlers`.

// Adjustments will be made in src/main/ipc/index.js as well
// to correctly reference `allPlugins`, `mainWindowRef`, `webContents`, `shell`.
// For `allPlugins`, since it's populated after `app.whenReady()`, it's best to pass it
// as an argument to `registerIpcHandlers`.