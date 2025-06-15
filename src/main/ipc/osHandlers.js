import { ipcMain } from 'electron';
import os from 'os';

/**
 * Registers IPC handlers for OS information.
 */
export function registerOsHandlers() {
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
}