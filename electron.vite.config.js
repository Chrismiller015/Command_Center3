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
    // No changes needed here
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    },
    plugins: [react()]
  }
})