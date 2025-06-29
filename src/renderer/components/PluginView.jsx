import React, { useEffect, useRef, useState } from 'react';
// Use the existing @heroicons/react library
import { Cog6ToothIcon, BugAntIcon } from '@heroicons/react/24/outline';

const PluginToolbar = ({ plugin, onDebug }) => {
  if (!plugin) return null;

  return (
    <div className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border-b border-white/10 px-4 py-1 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white">{plugin.manifest.name}</h2>
      <div className="flex items-center space-x-2">
        <button
          title="Plugin Settings"
          className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          onClick={() => alert('Plugin settings modal not yet implemented.')}
        >
          {/* Replaced with Heroicon */}
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
        <button
          title="Debug Plugin"
          className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          onClick={onDebug}
        >
          {/* Replaced with Heroicon */}
          <BugAntIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const PluginView = ({ plugin }) => {
  const webviewRef = useRef(null);
  const [preloadPath, setPreloadPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleDebugClick = () => {
    webviewRef.current?.openDevTools();
  };

  useEffect(() => {
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
      if (e.code !== -3) {
        setError(`Failed to load plugin content. Error code: ${e.code}.`);
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

  const { entryPoint, nodeIntegration } = plugin.manifest;

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Restored Toolbar with Heroicons */}
      <PluginToolbar plugin={plugin} onDebug={handleDebugClick} />
      
      <div className="flex-grow relative border-t border-black/20">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <p>Loading {plugin.manifest.name}...</p>
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
            className={`w-full h-full bg-transparent ${isLoading || error ? 'invisible' : ''}`}
            nodeintegration={nodeIntegration ? 'true' : undefined}
          ></webview>
        )}
      </div>
    </div>
  );
};

export default PluginView;