// src/main/database.js
import sqlite3 from 'sqlite3'
import { join } from 'path'

// Use verbose for more descriptive error messages
const verboseSqlite3 = sqlite3.verbose()
const dbPath = join(process.cwd(), 'command_center.db')
const db = new verboseSqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message)
  } else {
    console.log('Connected to the SQLite database.')
  }
})

// Generic function to run queries (INSERT, UPDATE, DELETE, CREATE, DROP)
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error running sql ' + sql)
        console.error(err)
        reject(err)
      } else {
        resolve({ lastID: this.lastID, changes: this.changes })
      }
    })
  })
}

// Generic function to get a single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.error('Error running sql: ' + sql)
        console.error(err)
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

// Generic function to get all rows
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error running sql: ' + sql)
        console.error(err)
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// Helper function to make strings safe for SQL table names
const sanitizeForSQL = (id) => id.replace(/-/g, '_')

// --- Specific Database Functions ---

async function initialize(plugins) {
  // Create global settings table
  await run(`
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  // Create tables for each plugin
  for (const plugin of plugins) {
    // Sanitize the plugin ID to ensure it's a valid table name prefix
    const safeId = sanitizeForSQL(plugin.id)

    // Create a dedicated settings table for each plugin
    await run(`
        CREATE TABLE IF NOT EXISTS plugin_${safeId}_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `)

    // Create custom tables defined in the manifest
    if (plugin.manifest.tables && Array.isArray(plugin.manifest.tables)) {
      for (const tableDef of plugin.manifest.tables) {
        const tableName = `plugin_${safeId}_${tableDef.name}`
        const columns = tableDef.columns.map((col) => `${col.name} ${col.type}`).join(', ')
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`
        await run(createTableSql)
      }
    }
  }
}

async function getGlobalSetting(key) {
  const result = await get('SELECT value FROM global_settings WHERE key = ?', [key])
  return result ? result.value : null
}

async function setGlobalSetting(key, value) {
  return await run('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)', [
    key,
    value
  ])
}

// --- NEW: Specific Plugin Settings Functions ---
async function getPluginSettings(pluginId) {
    const safeId = sanitizeForSQL(pluginId);
    const tableName = `plugin_${safeId}_settings`;
    try {
        const rows = await all(`SELECT key, value FROM ${tableName}`);
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    } catch (err) {
        // If the table doesn't exist yet (e.g., first run for a plugin), return empty settings
        if (err.message.includes('no such table')) {
            console.warn(`Settings table for plugin ${pluginId} (${tableName}) does not exist yet. Returning empty settings.`);
            return {};
        }
        console.error(`Error getting plugin settings for ${pluginId}:`, err.message);
        throw err;
    }
}

async function setPluginSetting(pluginId, key, value) {
    const safeId = sanitizeForSQL(pluginId);
    const tableName = `plugin_${safeId}_settings`;
    try {
        // Ensure the table exists before inserting/replacing
        await run(`CREATE TABLE IF NOT EXISTS ${tableName} (key TEXT PRIMARY KEY, value TEXT)`);
        return await run(`INSERT OR REPLACE INTO ${tableName} (key, value) VALUES (?, ?)`, [key, value]);
    } catch (err) {
        console.error(`Error saving plugin setting ${key} for ${pluginId}:`, err.message);
        throw err;
    }
}

// --- NEW: Database Management Functions for Settings Component ---

async function getAllTables() {
    // SQLite's master table contains schema information
    const rows = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    return rows.map(row => row.name);
}

async function getTableContent(tableName) {
    // Validate table name to prevent SQL injection for direct use
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
        throw new Error('Invalid table name.');
    }
    return await all(`SELECT rowid, * FROM ${tableName}`);
}

async function dropTable(tableName) {
     // Validate table name
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
        throw new Error('Invalid table name.');
    }
    return await run(`DROP TABLE IF EXISTS ${tableName}`);
}

async function deleteRow(tableName, rowid) {
    // Validate table name and rowid (ensure it's a number)
    if (!tableName.match(/^[a-zA-Z0-9_]+$/) || typeof rowid !== 'number' || rowid <= 0) {
        throw new Error('Invalid table name or row ID.');
    }
    return await run(`DELETE FROM ${tableName} WHERE rowid = ?`, [rowid]);
}


// Export all the functions as a single default object
export default {
  db, // Keep direct db access for advanced queries if needed (like db.run/all within IPC handlers)
  run,
  get,
  all,
  initialize,
  getGlobalSetting,
  setGlobalSetting,
  getPluginSettings, // NEW: Specific function
  setPluginSetting,   // NEW: Specific function
  getAllTables,       // NEW: For DB management in settings
  getTableContent,    // NEW: For DB management in settings
  dropTable,          // NEW: For DB management in settings
  deleteRow           // NEW: For DB management in settings
}