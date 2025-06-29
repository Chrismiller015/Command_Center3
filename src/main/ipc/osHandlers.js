import { ipcMain } from 'electron';
import os from 'os';

/**
 * Registers IPC handlers for OS-related information requests.
 */
export function registerOsHandlers() {
  /**
   * Gathers all necessary system information in one call and returns it as an object.
   * This is more efficient and reliable than making multiple individual IPC calls.
   */
  ipcMain.handle('get-all-system-info', () => {
    try {
      return {
        hostname: os.hostname(),
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        cpus: os.cpus(),
      };
    } catch (error) {
      console.error(`[osHandler] Error gathering all system info:`, error);
      // Re-throw the error to be caught by the invoker in the renderer process
      throw error;
    }
  });
}