# Command Center Application

This is a plugin-based command center application built with Electron, React, Vite, and Tailwind CSS. This is a personal app that bypasses a lot of security restrictions as I intended it only for me, but have to post this repo publicly for reasons. I don't suggest using this app.

## How to Set Up and Run

1.  **Install Dependencies:**
    Open your terminal in the project root and run:

    ```bash
    npm install
    ```

2.  **Run the Application in Development Mode:**
    This command will start the Vite dev server for the React frontend and launch the Electron app. It supports hot-reloading for the UI.

    ```bash
    npm run dev
    ```

3.  **Build for Production:**
    To create a production-ready build, run:

    ```bash
    npm run build
    ```

    This will compile the React app into the `/dist` folder.

4.  **Run the Production App:**
    After building, you can start the app directly without the Vite dev server. This is how it would run from a packaged installer.
    ```bash
    npm start
    ```

## How It Works

- **Electron (`/electron`):** The main process handles window creation, backend logic, and communication with the filesystem and database.
- **React (`/src`):** The entire UI shell is a React application, built and served by Vite.
- **Plugins (`/plugins`):** Each sub-directory in `/plugins` is a self-contained plugin. The app discovers them at launch by reading their `manifest.json` file.

## Creating a New Plugin

1.  Create a new folder inside the `/plugins` directory (e.g., `/my-new-plugin`).
2.  Inside, create a `manifest.json` file. This file defines the plugin's name, settings, and database tables. See the example plugins for the structure.
3.  Create an `index.html` file, which is the entry point for your plugin's UI.
4.  Your plugin's HTML/JS can interact with the main application and database using the `window.electronAPI` object, which is automatically injected.
