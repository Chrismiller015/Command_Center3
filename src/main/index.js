import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadPlugins, getPlugins, getPluginServices } from './pluginManager.js'
import { initializeDatabase } from './database.js'
import { registerIpcHandlers } from './ipc/index.js'

let mainWindow

// FIX: Define the preload script path in a variable accessible in this scope
const preloadScriptPath = join(__dirname, '../preload/index.js');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      // Use the variable for the main window's preload
      preload: preloadScriptPath,
      sandbox: false,
      webviewTag: true,
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

  // FIX: Add a new IPC handler to provide the preload path to the renderer
  ipcMain.handle('get-preload-path', () => preloadScriptPath);

  try {
    const loadedPlugins = await loadPlugins();
    await initializeDatabase(loadedPlugins);
    registerIpcHandlers(mainWindow, getPluginServices(), getPlugins());
  } catch (error) {
    console.error('Failed during app initialization:', error);
    app.quit();
    return;
  }
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-plugins', () => {
  return getPlugins();
});