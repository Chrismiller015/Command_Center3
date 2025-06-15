// src/main/ipc/index.js
// This file serves as the central point for registering all IPC handlers in the main process.

// Electron modules for IPC, shell operations, and managing web contents
import { ipcMain, shell, webContents } from 'electron'; 
// Node.js 'path' module for path manipulation
import path from 'path'; 

// Import individual IPC handler modules.
// IMPORTANT: Node.js ES Modules require explicit file extensions for relative imports.
import { registerSettingsHandlers } from './settingsHandlers.js';
import { registerDatabaseHandlers } from './databaseHandlers.js';
import { registerDialogHandlers } from './dialogHandlers.js';
import { registerClipboardHandler } from './clipboardHandler.js';
import { registerNotificationHandler } from './notificationHandler.js';
import { registerOsHandlers } from './osHandlers.js'; 

/**
 * Registers all IPC handlers for the main process.
 * This function is called from src/main/index.js during app initialization.
 * * @param {Electron.BrowserWindow} mainWindowRef - A reference to the main browser window.
 * Used for parenting dialogs and sending messages.
 * @param {Map<string, object>} pluginServicesRef - A reference to the Map storing loaded plugin service APIs.
 * @param {Array<object>} allPluginsRef - A reference to the array of all loaded plugin manifests.
 */
export function registerIpcHandlers(mainWindowRef, pluginServicesRef, allPluginsRef) {
  // Register handlers from dedicated modules
  registerSettingsHandlers();
  registerDatabaseHandlers();
  registerDialogHandlers(mainWindowRef); // Dialogs need the main window for parenting
  registerClipboardHandler();
  registerNotificationHandler();
  registerOsHandlers();

  // IPC handler for generic plugin service calls.
  // This allows renderer processes to invoke methods on plugin backend services.
  ipcMain.handle('plugin:service-call', async (event, { pluginId, method, params }) => {
    // Retrieve the specific plugin service module from the map
    const serviceModule = pluginServicesRef.get(pluginId); 
    if (!serviceModule) {
        console.error(`[IPC] Service for plugin "${pluginId}" not found for method "${method}".`);
        throw new Error(`Service for plugin "${pluginId}" not found.`);
    }
    // Determine the function to call: either a default export method or a named export
    const serviceFunction = (serviceModule.default && typeof serviceModule.default[method] === 'function') 
                            ? serviceModule.default[method] 
                            : serviceModule[method];

    if (typeof serviceFunction !== 'function') {
        console.error(`[IPC] Method "${method}" not found or not a function in plugin "${pluginId}" service.`);
        throw new Error(`Method "${method}" not found in plugin "${pluginId}" service.`);
    }
    try {
        // Execute the service function with provided parameters
        return await serviceFunction(params); 
    } catch (error) {
        // Log the error and re-throw so the renderer receives it
        console.error(`[IPC] Error calling service method ${pluginId}:${method}:`, error);
        throw error; 
    }
  });

  // IPC handler to request opening a plugin-specific modal.
  // It finds the target webview and sends an IPC message to it.
  ipcMain.handle('open-plugin-specific-modal', (event, { pluginId, modalType }) => {
    // Find the webContents of the specific webview that corresponds to the pluginId
    const targetWebContents = webContents.getAllWebContents().find(wc => {
      // Exclude the main window's webContents
      if (wc.id === mainWindowRef.webContents.id) {
          return false;
      }
      // Check if the webview's URL belongs to the target plugin
      const url = wc.getURL();
      if (url.startsWith('file://')) {
          // Normalize file path for comparison across OS
          const fsPath = process.platform === 'win32' ? url.slice(8) : url.slice(7); 
          // Find the plugin's path from the loaded plugins array
          const pluginPath = allPluginsRef.find(p => p.id === pluginId)?.path; 
          // Check if the webview's path is a sub-path of the plugin's root path
          if (pluginPath && path.normalize(fsPath).includes(path.normalize(pluginPath))) {
              return true;
          }
      }
      return false;
    });

    if (targetWebContents) {
        // Send a message to the target webview's renderer process
        targetWebContents.send('plugin-modal-request', { modalType });
        console.log(`[Main] Sent 'plugin-modal-request' (${modalType}) to webview for plugin ${pluginId}`);
    } else {
        console.warn(`[Main] No webview found for plugin ${pluginId} to open modal ${modalType}.`);
    }
    return true; 
  });

  // IPC handler to open external links using the system's default browser.
  ipcMain.handle('open-external-link', async (_, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error(`Error opening external link ${url}:`, error);
        return { success: false, error: error.message };
    }
  });

  // IPC listener for showing a general toast message on the main window.
  ipcMain.on('show-toast', (event, toastOptions) => {
    if (mainWindowRef) {
        mainWindowRef.webContents.send('show-toast', toastOptions);
    }
  });

  // IPC listener for showing a toast message specifically originating from a plugin.
  // This forwards the request to the main window's renderer process.
  ipcMain.on('show-toast-from-plugin', (event, toastOptions) => {
    if (mainWindowRef) {
        mainWindowRef.webContents.send('show-toast', toastOptions);
    }
  });
}