import React, { useEffect, useRef, useState } from 'react';

const PluginView = ({ plugin }) => {
  const webviewRef = useRef(null);
  const [preloadPath, setPreloadPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset state when the plugin prop changes to ensure a fresh load
    setIsLoading(true);
    setError(null);
    setPreloadPath('');

    const fetchPreloadPath = async () => {
      try {
        const path = await window.electronAPI.getPreloadPath();
        setPreloadPath(path);
      } catch (error) {
        console.error('Failed to get preload path:', error);
        setError('Could not load plugin environment.');
        setIsLoading(false);
      }
    };

    fetchPreloadPath();

    const webview = webviewRef.current;
    if (!webview) return;

    const handleLoadStop = () => setIsLoading(false);
    const handleLoadFail = (e) => {
      console.error(`Plugin '${plugin?.manifest?.name}' failed to load:`, e);
       // Error code -3 is ERR_ABORTED, which can happen during hot-reloads. We can safely ignore it.
      if (e.code !== -3) {
        setError(`Failed to load plugin content. Error code: ${e.code}. Check the file path and manifest.`);
        setIsLoading(false);
      }
    };

    webview.addEventListener('did-stop-loading', handleLoadStop);
    webview.addEventListener('did-fail-load', handleLoadFail);

    return () => {
      webview.removeEventListener('did-stop-loading', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleLoadFail);
    };
  }, [plugin]);

  if (!plugin || !plugin.manifest) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <p className="text-gray-400">Select a plugin from the sidebar to get started.</p>
      </div>
    );
  }

  // ** FIX: Access all properties from plugin.manifest **
  const { name, entryPoint, nodeIntegration } = plugin.manifest;

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      <div className="flex-grow relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <p>Loading {name}...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-center p-4">
            <p className="text-red-500 font-semibold">Error Loading Plugin</p>
            <p className="text-red-400 text-sm mt-2">{error}</p>
          </div>
        )}
        {preloadPath && entryPoint && (
          <webview
            ref={webviewRef}
            src={`file://${entryPoint}`}
            preload={`file://${preloadPath}`}
            className={`w-full h-full ${isLoading || error ? 'invisible' : ''}`}
            nodeintegration={nodeIntegration ? 'true' : undefined}
          ></webview>
        )}
      </div>
    </div>
  );
};

export default PluginView;