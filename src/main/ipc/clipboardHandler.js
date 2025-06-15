import { ipcMain, clipboard } from 'electron';

/**
 * Registers IPC handler for clipboard operations.
 */
export function registerClipboardHandler() {
  ipcMain.handle('write-to-clipboard', async (event, { format, data }) => {
    if (format === 'html') {
      clipboard.writeHTML(data);
      clipboard.writeText(data); // Also write as text for applications that don't support HTML pasting
    } else if (format === 'rtf') {
      clipboard.write({
        text: data, // Fallback plain text is good practice
        rtf: data
      });
      console.log('Attempted to write RTF to clipboard.');
    } else { // Handles 'text', 'markdown', 'tsv', and any unknown formats as plain text
      clipboard.writeText(data);
    }
    return true;
  });
}