// src/main/database.js
import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'path';
// FIX: Added the missing import for the Node.js File System module
import fs from 'fs';

// Use verbose for more descriptive error messages
const verboseSqlite3 = sqlite3.verbose();
const dbPath = path.join(app.getPath('userData'), 'command_center.db');
let dbInstance;

/**
 * Returns the active database instance. Throws an error if it's not initialized.
 * @returns {sqlite3.Database}
 */
export function getDB() {
  if (!dbInstance) {
    throw new Error("Database has not been initialized. Call initializeDatabase first.");
  }
  return dbInstance;
}

/**
 * Initializes the database connection.
 * @returns {Promise<void>}
 */
function connectToDatabase() {
  return new Promise((resolve, reject) => {
    // Check if the directory exists, if not create it.
    const dir = path.dirname(dbPath);
    // This 'fs' call is what caused the error. It will now work correctly.
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new verboseSqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
        return reject(err);
      }
      console.log('Connected to the SQLite database.');
      resolve();
    });
  });
}

// Generic function to run queries (INSERT, UPDATE, DELETE, CREATE, DROP)
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function (err) {
      if (err) {
        console.error('Error running sql ' + sql);
        console.error(err);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Generic function to get a single row
export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, result) => {
      if (err) {
        console.error('Error running sql: ' + sql);
        console.error(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Generic function to get all rows
export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error running sql: ' + sql);
        console.error(err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Helper function to make strings safe for SQL table names
const sanitizeForSQL = (id) => id.replace(/-/g, '_');

/**
 * Initializes the database schema, creating tables for the app and plugins.
 * This is the main entry point for database setup.
 * @param {Array<Object>} plugins - An array of loaded plugin objects.
 */
export async function initializeDatabase(plugins = []) {
  if (!dbInstance) {
    await connectToDatabase();
  }

  // Create global settings table
  await run(`
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Create tables for each plugin
  for (const plugin of plugins) {
    const safeId = sanitizeForSQL(plugin.id);

    // Create a dedicated settings table for each plugin
    await run(`
        CREATE TABLE IF NOT EXISTS plugin_${safeId}_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    // Create custom tables defined in the manifest
    if (plugin.manifest.tables && Array.isArray(plugin.manifest.tables)) {
      for (const tableDef of plugin.manifest.tables) {
        const tableName = `plugin_${safeId}_${tableDef.name}`;
        const columns = tableDef.columns.map((col) => `${col.name} ${col.type}`).join(', ');
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
        await run(createTableSql);
      }
    }
  }
}

// --- Specific Database Functions ---

export async function getGlobalSetting(key) {
  const result = await get('SELECT value FROM global_settings WHERE key = ?', [key]);
  return result ? result.value : null;
}

export async function setGlobalSetting(key, value) {
  return await run('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)', [
    key,
    value
  ]);
}

export async function getPluginSettings(pluginId) {
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
        if (err.message.includes('no such table')) {
            console.warn(`Settings table for plugin ${pluginId} not found. Returning empty settings.`);
            return {};
        }
        console.error(`Error getting plugin settings for ${pluginId}:`, err.message);
        throw err;
    }
}

export async function setPluginSetting(pluginId, key, value) {
    const safeId = sanitizeForSQL(pluginId);
    const tableName = `plugin_${safeId}_settings`;
    return await run(`INSERT OR REPLACE INTO ${tableName} (key, value) VALUES (?, ?)`, [key, value]);
}

export async function getAllTables() {
    const rows = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    return rows.map(row => row.name);
}

export async function getTableContent(tableName) {
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
        throw new Error('Invalid table name.');
    }
    return await all(`SELECT rowid, * FROM ${tableName}`);
}

export async function dropTable(tableName) {
    if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
        throw new Error('Invalid table name.');
    }
    return await run(`DROP TABLE IF EXISTS ${tableName}`);
}

export async function deleteRow(tableName, rowid) {
    if (!tableName.match(/^[a-zA-Z0-9_]+$/) || (typeof rowid !== 'number' && typeof rowid !== 'string')) {
        throw new Error('Invalid table name or row ID.');
    }
    return await run(`DELETE FROM ${tableName} WHERE rowid = ?`, [rowid]);
}