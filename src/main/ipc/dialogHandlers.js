import { ipcMain, dialog, BrowserWindow } from 'electron';

/**
 * Registers IPC handlers for various dialogs.
 * @param {BrowserWindow} mainWindowRef - A reference to the main window for dialog parenting.
 */
export function registerDialogHandlers(mainWindowRef) {
  ipcMain.handle('show-confirmation-dialog', async (event, title, message) => {
    const result = await dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender), {
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 1, // 'No' is default
      title: title,
      message: message
    });
    return result.response === 0; // 'Yes' button is index 0
  });

  ipcMain.handle('show-error-dialog', async (event, title, message) => {
    await dialog.showErrorBox(title, message);
  });

  ipcMain.handle('show-info-dialog', async (event, title, message) => {
    await dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender), {
      type: 'info',
      title: title,
      message: message
    });
  });

  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), options);
    return result;
  });

  ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), options);
    return result;
  });
}