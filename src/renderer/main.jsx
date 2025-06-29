import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

/**
 * Renders the main React application.
 */
const renderApp = () => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

/**
 * Checks if the electronAPI is attached to the window object.
 * If it is, the app is rendered. If not, it waits and checks again.
 * This prevents a race condition between the preload script and the React app.
 */
const initialize = () => {
  if (window.electronAPI) {
    console.log('Command Center: electronAPI is ready. Rendering application.');
    renderApp();
  } else {
    console.log('Command Center: electronAPI not ready, waiting...');
    // If the API isn't ready, wait for the next animation frame and try again.
    // This is more efficient than a setTimeout loop.
    requestAnimationFrame(initialize);
  }
};

// Start the initialization process
initialize();