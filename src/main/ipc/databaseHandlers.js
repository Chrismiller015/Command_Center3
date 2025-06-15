import { ipcMain, app } from 'electron';
// Correctly import the specific functions needed using named imports
import { getDB, run, getAllTables, getTableContent, dropTable, deleteRow } from '../database.js';
import { getPlugins } from '../pluginManager.js';

const sanitizeForSQL = (id) => id.replace(/-/g, '_');

/**
 * Registers IPC handlers for plugin database access and global database management.
 */
export function registerDatabaseHandlers() {
  // Plugin Database Access (for plugin's own tables)
  // These handlers use the generic 'run', 'get', and 'all' from database.js
  // after ensuring the query is safe for the plugin's scope.
  ipcMain.handle('db-run-query', async (_, { pluginId, sql, params }) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(' from plugin_') && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return run(sql, params);
  });

  ipcMain.handle('db-get-query', async (_, { pluginId, sql, params }) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(' from plugin_') && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return get(sql, params);
  });

  ipcMain.handle('db-all-query', async (_, { pluginId, sql, params }) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(' from plugin_') && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return all(sql, params);
  });

  // Database Management IPC (for Settings component)
  // These handlers directly call the corresponding exported functions from database.js
  ipcMain.handle('db-get-all-tables', () => getAllTables());
  ipcMain.handle('db-get-table-content', (_, tableName) => getTableContent(tableName));
  ipcMain.handle('db-drop-table', (_, tableName) => dropTable(tableName));
  ipcMain.handle('db-delete-row', (_, { tableName, rowid }) => deleteRow(tableName, rowid));

  // Regenerate plugin tables (danger zone)
  ipcMain.handle('plugin-regenerate-tables', async (_, pluginId) => {
    console.log(`[Main Process] Regenerating tables for plugin: ${pluginId}`);
    try {
      const allPlugins = getPlugins();
      const pluginToRegenerate = allPlugins.find(p => p.id === pluginId);

      if (pluginToRegenerate) {
        // This logic needs to be fully implemented based on how you want to handle table recreation.
        // For example, you might drop existing tables and then re-run part of the initial setup.
        console.warn("Regeneration logic needs to be fully implemented.");
        
        const safePluginId = sanitizeForSQL(pluginId);
        
        // Example of dropping custom tables:
        if (pluginToRegenerate.manifest.tables && Array.isArray(pluginToRegenerate.manifest.tables)) {
          for (const tableDef of pluginToRegenerate.manifest.tables) {
            const tableName = `plugin_${safePluginId}_${tableDef.name}`;
            console.log(`[Main Process] Dropping custom plugin table: ${tableName}`);
            await dropTable(tableName);
          }
        }
        
        // You would then need a way to re-create them, perhaps by calling initializeDatabase again
        // or a more specific table creation function.
        
        console.log(`[Main Process] Tables for ${pluginId} have been processed for regeneration. Restarting app...`);
        app.relaunch();
        app.exit();

      } else {
        throw new Error(`Plugin ${pluginId} not found for regeneration.`);
      }
    } catch (error) {
      console.error(`Error regenerating tables for ${pluginId}:`, error);
      throw error;
    }
  });
}