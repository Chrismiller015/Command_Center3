import { ipcMain, app } from 'electron';
import db from '../database.js'; // Assuming database.js is in the parent directory
import pluginManager from '../pluginManager.js'; // Assuming pluginManager.js is in the parent directory

const sanitizeForSQL = (id) => id.replace(/-/g, '_');

/**
 * Registers IPC handlers for plugin database access and global database management.
 */
export function registerDatabaseHandlers() {
  // Plugin Database Access (for plugin's own tables)
  ipcMain.handle('db-run-query', async (_, pluginId, sql, params) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(` from plugin_`) && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return await db.run(sql, params);
  });

  ipcMain.handle('db-get-query', async (_, pluginId, sql, params) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(` from plugin_`) && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return await db.get(sql, params);
  });

  ipcMain.handle('db-all-query', async (_, pluginId, sql, params) => {
    const safeId = sanitizeForSQL(pluginId);
    const tableNamePrefix = `plugin_${safeId}_`;
    if (sql.toLowerCase().includes(` from plugin_`) && !sql.toLowerCase().includes(tableNamePrefix)) {
      throw new Error(`Access denied: Query attempts to access tables outside of plugin ${pluginId}'s scope.`);
    }
    return await db.all(sql, params);
  });

  // Database Management IPC (for Settings component)
  ipcMain.handle('db-get-all-tables', async () => await db.getAllTables());
  ipcMain.handle('db-get-table-content', async (_, tableName) => await db.getTableContent(tableName));
  ipcMain.handle('db-drop-table', async (_, tableName) => await db.dropTable(tableName));
  ipcMain.handle('db-delete-row', async (_, tableName, rowid) => await db.deleteRow(tableName, rowid));

  // Regenerate plugin tables (danger zone)
  ipcMain.handle('plugin-regenerate-tables', async (_, pluginId) => {
    console.log(`[Main Process] Regenerating tables for plugin: ${pluginId}`);
    try {
      const plugins = await pluginManager.loadPlugins(); // Reload plugins to get latest manifest
      const pluginToRegenerate = plugins.find(p => p.id === pluginId);

      if (pluginToRegenerate) {
        // Find existing tables for this plugin and drop them
        const allTables = await db.getAllTables();
        const safePluginId = pluginId.replace(/-/g, '_');
        
        // Drop plugin-specific settings table
        const pluginSettingsTableName = `plugin_${safePluginId}_settings`;
        if (allTables.includes(pluginSettingsTableName)) {
            console.log(`[Main Process] Dropping plugin settings table: ${pluginSettingsTableName}`);
            await db.run(`DROP TABLE IF EXISTS ${pluginSettingsTableName}`);
        }

        // Drop custom tables defined in manifest
        if (pluginToRegenerate.manifest.tables && Array.isArray(pluginToRegenerate.manifest.tables)) {
            for (const tableDef of pluginToRegenerate.manifest.tables) {
                const tableName = `plugin_${safePluginId}_${tableDef.name}`;
                if (allTables.includes(tableName)) {
                    console.log(`[Main Process] Dropping custom plugin table: ${tableName}`);
                    await db.run(`DROP TABLE IF EXISTS ${tableName}`);
                }
            }
        }

        // Re-initialize only this plugin's tables
        await db.initialize([pluginToRegenerate]);
        console.log(`[Main Process] Tables regenerated for ${pluginId}. Restarting app...`);
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