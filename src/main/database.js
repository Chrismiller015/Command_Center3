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

// Generic function to run queries (INSERT, UPDATE, DELETE)
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

// --- Specific Functions ---

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

// Export all the functions as a single default object
export default {
  db,
  run,
  get,
  all,
  initialize,
  getGlobalSetting,
  setGlobalSetting
}