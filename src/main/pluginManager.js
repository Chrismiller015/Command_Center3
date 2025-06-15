import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';

const pluginsDir = join(process.cwd(), 'plugins');
// These variables will hold the loaded plugins and their services in memory
let loadedPlugins = [];
const pluginServices = new Map();

/**
 * Loads a single plugin's service module if it exists.
 * @param {object} plugin - The plugin object.
 */
async function loadPluginService(plugin) {
  const servicePath = join(plugin.path, 'service', 'index.mjs');
  try {
    const serviceModule = await import(`file://${servicePath}`);
    pluginServices.set(plugin.id, serviceModule);
    console.log(`[PluginManager] Service loaded for plugin: ${plugin.id}`);
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error(`[PluginManager] Error loading service for plugin ${plugin.id}:`, error);
    }
    // If the service file doesn't exist, we just ignore it.
  }
}

/**
 * Scans the plugins directory, reads manifests, and loads their services.
 * @returns {Promise<Array<Object>>} A promise that resolves with the array of loaded plugins.
 */
export async function loadPlugins() {
  const pluginFolders = await fs.readdir(pluginsDir, { withFileTypes: true });
  const plugins = [];
  pluginServices.clear(); // Clear old services before loading new ones

  for (const dirent of pluginFolders) {
    if (dirent.isDirectory()) {
      const manifestPath = join(pluginsDir, dirent.name, 'manifest.json');
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        const plugin = {
          id: dirent.name,
          path: join(pluginsDir, dirent.name),
          manifest: manifest
        };
        plugins.push(plugin);
        await loadPluginService(plugin); // Load the service for this plugin
      } catch (error) {
        console.error(`Could not load plugin from ${dirent.name}:`, error);
      }
    }
  }
  loadedPlugins = plugins;
  return loadedPlugins;
}

/**
 * Returns the array of plugins that have already been loaded into memory.
 * @returns {Array<Object>} The array of loaded plugin objects.
 */
export function getPlugins() {
  return loadedPlugins;
}

/**
 * NEW: Returns the map of loaded plugin service modules.
 * @returns {Map<string, object>} The map of plugin services.
 */
export function getPluginServices() {
  return pluginServices;
}

/**
 * Installs dependencies listed in the manifests of the provided plugins.
 * @param {Array<Object>} plugins - An array of plugin objects.
 * @returns {Promise<boolean>} A promise that resolves to true if an install was run, false otherwise.
 */
export function installDependencies(plugins) {
  return new Promise((resolve, reject) => {
    const dependencies = new Set();
    plugins.forEach((plugin) => {
      if (plugin.manifest.dependencies) {
        Object.keys(plugin.manifest.dependencies).forEach((dep) => {
          try {
            require.resolve(dep);
          } catch (e) {
            dependencies.add(`${dep}@${plugin.manifest.dependencies[dep]}`);
          }
        });
      }
    });

    if (dependencies.size === 0) {
      console.log('All plugin dependencies are already satisfied.');
      return resolve(false);
    }

    const command = `npm install ${[...dependencies].join(' ')}`;
    console.log(`[PluginManager] Running installation: ${command}`);

    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[PluginManager] Error installing plugin dependencies: ${error.message}`);
        if (stderr) {
            console.error(`[PluginManager] Stderr: ${stderr}`);
        }
        return reject(error);
      }
      console.log(`[PluginManager] Dependency installation stdout: ${stdout}`);
      if (stderr) {
        console.warn(`[PluginManager] Dependency installation stderr (might contain warnings): ${stderr}`);
      }
      resolve(true);
    });
  });
}