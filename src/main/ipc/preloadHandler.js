import { ipcMain } from 'electron';
import { join } from 'path';

/**
 * Registers IPC handlers for preload script related requests.
 */
export function registerPreloadHandler() {
  /**
   * Returns the absolute path to the main preload script.
   * This is needed by the renderer to correctly configure <webview> tags.
   */
  ipcMain.handle('get-preload-path', () => {
    // The path must resolve to the output directory, which is why we go
    // up one level from `__dirname` (which is in `out/main`).
    return join(__dirname, '..', 'preload', 'index.js');
  });
}