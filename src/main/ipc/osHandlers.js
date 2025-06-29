import { ipcMain } from 'electron';
import os from 'os';

/**
 * Registers IPC handlers for OS-related information requests.
 */
export function registerOsHandlers() {
  /**
   * Handles a generic request for a piece of OS information.
   * This single handler replaces multiple individual handlers for efficiency.
   */
  ipcMain.handle('get-os-info', (event, infoType) => {
    try {
      switch (infoType) {
        case 'hostname':
          return os.hostname();
        case 'type':
          return os.type();
        case 'platform':
          return os.platform();
        case 'arch':
          return os.arch();
        case 'release':
          return os.release();
        case 'uptime':
          return os.uptime();
        case 'loadavg':
          return os.loadavg();
        case 'totalmem':
          return os.totalmem();
        case 'freemem':
          return os.freemem();
        case 'cpus':
          return os.cpus();
        case 'networkInterfaces':
          return os.networkInterfaces();
        default:
          // For security, only expose known os properties.
          console.warn(`Attempted to access invalid OS info type: ${infoType}`);
          throw new Error(`Invalid OS info type requested: ${infoType}`);
      }
    } catch (error) {
      console.error(`Error fetching OS info for type '${infoType}':`, error);
      // Re-throw the error to be caught by the invoker in the renderer process
      throw error;
    }
  });
}