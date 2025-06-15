const { resolve } = require('path')
const { defineConfig } = require('electron-vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  main: {
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
        // FIX: Tell Vite that 'electron' is an external module and should not be bundled.
        external: ['electron']
      }
    },
    plugins: [react()]
  }
})