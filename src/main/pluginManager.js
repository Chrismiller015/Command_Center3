import { promises as fs } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'

const pluginsDir = join(process.cwd(), 'plugins')

async function loadPlugins() {
  const pluginFolders = await fs.readdir(pluginsDir, { withFileTypes: true })
  const plugins = []

  for (const dirent of pluginFolders) {
    if (dirent.isDirectory()) {
      const manifestPath = join(pluginsDir, dirent.name, 'manifest.json')
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8')
        const manifest = JSON.parse(manifestContent)
        plugins.push({
          id: dirent.name,
          path: join(pluginsDir, dirent.name),
          manifest: manifest
        })
      } catch (error) {
        console.error(`Could not load plugin from ${dirent.name}:`, error)
      }
    }
  }
  return plugins
}

function installDependencies(plugins) {
  return new Promise((resolve, reject) => {
    const dependencies = new Set()
    plugins.forEach((plugin) => {
      if (plugin.manifest.dependencies) {
        Object.keys(plugin.manifest.dependencies).forEach((dep) => {
          // A simple check to see if it might already be in node_modules
          // This isn't perfect but can prevent re-installs.
          try {
            require.resolve(dep);
          } catch (e) {
            dependencies.add(`${dep}@${plugin.manifest.dependencies[dep]}`)
          }
        })
      }
    })

    if (dependencies.size === 0) {
      console.log('All plugin dependencies are already satisfied.')
      return resolve(false) // Indicate that no installation was performed.
    }

    const command = `npm install ${[...dependencies].join(' ')}`
    console.log(`[PluginManager] Running installation: ${command}`)

    // Add cwd option for robustness
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[PluginManager] Error installing plugin dependencies: ${error.message}`)
        if (stderr) {
            console.error(`[PluginManager] Stderr: ${stderr}`);
        }
        return reject(error)
      }
      console.log(`[PluginManager] Dependency installation stdout: ${stdout}`)
      if (stderr) {
        console.warn(`[PluginManager] Dependency installation stderr (might contain warnings): ${stderr}`)
      }
      resolve(true) // Indicate that an installation was performed.
    })
  })
}

export default { loadPlugins, installDependencies }