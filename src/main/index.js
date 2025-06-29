import { app, shell, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { loadPlugins, getPlugins, getPluginServices } from './pluginManager.js';
import { initializeDatabase } from './database.js';
import { registerIpcHandlers } from './ipc/index.js';

// Define mainWindow in a scope accessible to all functions
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,
      // *** FIX: This line is critical for the preload script to work correctly ***
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron.commandcenter');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  try {
    // 1. Perform all asynchronous setup first
    const loadedPlugins = await loadPlugins();
    await initializeDatabase(loadedPlugins);

    // 2. Create the main application window
    createWindow();

    // 3. Now that `mainWindow` exists, register all IPC handlers
    registerIpcHandlers(mainWindow, getPluginServices(), getPlugins());
    
    // This handler provides the list of plugins to the renderer
    ipcMain.handle('get-plugins', () => {
        return getPlugins();
    });

  } catch (error) {
    console.error('Failed during app initialization:', error);
    app.quit();
    return;
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