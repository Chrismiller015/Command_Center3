const { resolve } = require('path')
const { defineConfig } = require('electron-vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  main: {
    // ADDED: Resolve configuration for main process
    resolve: {
      // Specify extensions that should be resolved automatically.
      // This tells Vite/Rollup to try appending .js, .json, .node if a file name without extension is imported.
      // Even though we explicitly added .js, this ensures the resolver correctly processes it.
      extensions: ['.js', '.json', '.node'],
      // You can also add aliases here if needed, but not required for this issue.
      // alias: {
      //   '@main': resolve(__dirname, 'src/main')
      // }
    },
    build: {
      rollupOptions: {
        // Tell the bundler to not touch these packages
        external: ['@electron-toolkit/utils', 'sqlite3']
      }
    }
  },
  preload: {
    // Nothing needed here for now
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
        // Tell Vite that 'electron' is an external module and should not be bundled.
        external: ['electron']
      }
    },
    plugins: [react()]
  }
})