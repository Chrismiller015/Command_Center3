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
          dependencies.add(`${dep}@${plugin.manifest.dependencies[dep]}`)
        })
      }
    })

    if (dependencies.size === 0) {
      console.log('No new plugin dependencies to install.')
      return resolve()
    }

    const command = `npm install ${[...dependencies].join(' ')}`
    console.log(`Running installation: ${command}`)

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing plugin dependencies: ${error}`)
        return reject(error)
      }
      console.log(`Dependency installation stdout: ${stdout}`)
      if (stderr) console.error(`Dependency installation stderr: ${stderr}`)
      resolve()
    })
  })
}

export default { loadPlugins, installDependencies }