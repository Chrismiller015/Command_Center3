import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import db from './database.js'
import pluginManager from './pluginManager.js'

let mainWindow

// Function to make IDs SQL-safe
const sanitizeForSQL = (id) => id.replace(/-/g, '_')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon: join(__dirname, '../../build/icon.png') } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  // This event listener will configure any webview created in our app
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // We are telling the new webview to use the SAME preload script
    // as our main window, and disabling its sandbox.
    webPreferences.preload = join(__dirname, '../preload/index.js')
    webPreferences.sandbox = false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  console.log('App is ready. Initializing...')
  try {
    const plugins = await pluginManager.loadPlugins()
    console.log(`Loaded ${plugins.length} plugins.`)
    await pluginManager.installDependencies(plugins)
    await db.initialize(plugins)
    console.log('Database initialized successfully.')
  } catch (error) {
    console.error('Failed during app initialization:', error)
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// --- IPC Handlers (with sanitization) ---
ipcMain.handle('get-plugins', async () => {
  const plugins = await pluginManager.loadPlugins()
  return plugins.map((plugin) => ({
    ...plugin,
    entryPointPath: `file://${join(plugin.path, plugin.manifest.entryPoint)}`
  }))
})

ipcMain.handle('db-get-global-setting', async (_, key) => {
  return await db.getGlobalSetting(key)
})

ipcMain.handle('db-set-global-setting', async (_, key, value) => {
  return await db.setGlobalSetting(key, value)
})

ipcMain.handle('db-get-plugin-settings', async (_, pluginId) => {
  const safeId = sanitizeForSQL(pluginId)
  const settings = await db.all(`SELECT * FROM plugin_${safeId}_settings`)
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})
})

ipcMain.handle('db-set-plugin-setting', async (_, pluginId, key, value) => {
  const safeId = sanitizeForSQL(pluginId)
  return await db.run(
    `INSERT OR REPLACE INTO plugin_${safeId}_settings (key, value) VALUES (?, ?)`,
    [key, value]
  )
})

ipcMain.handle('db-run-query', async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId)
  const tableName = `plugin_${safeId}_`
  if (!sql.includes(tableName)) {
    throw new Error(`Query must target a table starting with '${tableName}'`)
  }
  return await db.run(sql, params)
})

ipcMain.handle('db-all-query', async (_, pluginId, sql, params) => {
  const safeId = sanitizeForSQL(pluginId)
  const tableName = `plugin_${safeId}_`
  if (!sql.includes(tableName)) {
    throw new Error(`Query must target a table starting with '${tableName}'`)
  }
  return await db.all(sql, params)
})

ipcMain.handle('plugin-regenerate-tables', async (_, pluginId) => {
  const safeId = sanitizeForSQL(pluginId)
  const plugin = (await pluginManager.loadPlugins()).find((p) => p.id === pluginId)
  if (plugin && plugin.manifest.tables) {
    for (const tableDef of plugin.manifest.tables) {
      const tableName = `plugin_${safeId}_${tableDef.name}`
      console.log(`Dropping table: ${tableName}`)
      await db.run(`DROP TABLE IF EXISTS ${tableName}`)
    }
    await db.run(`DROP TABLE IF EXISTS plugin_${safeId}_settings`)
  }
  app.relaunch()
  app.quit()
})