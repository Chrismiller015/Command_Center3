import React, { useEffect, useRef, useState } from 'react';
import { CogIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon as RefreshIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import PluginSettings from './PluginSettings';

function PluginView({ plugin }) {
  const webviewRef = useRef(null);
  const [isWebviewReady, setIsWebviewReady] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [preloadPath, setPreloadPath] = useState('');

  // Fetch the preload path when the component mounts
  useEffect(() => {
    const fetchPreloadPath = async () => {
      try {
        const path = await window.electronAPI.getPreloadPath();
        setPreloadPath(path);
      } catch (error) {
        console.error("Failed to get preload path:", error);
      }
    };
    fetchPreloadPath();
  }, []);

  const entryPoint = plugin?.manifest?.entryPoint;
  
  if (!plugin || !entryPoint) {
    return <div className="p-4 text-red-400">Error: Cannot load plugin. It may be missing 'entryPoint' in its manifest.json.</div>;
  }
  
  const pluginPath = `file://${plugin.path}/${entryPoint}`;

  useEffect(() => {
    if (!webviewRef.current || !preloadPath) return;

    const webview = webviewRef.current;
    setIsWebviewReady(false);
    
    // Set the preload attribute programmatically
    webview.preload = `file://${preloadPath}`;

    const handleDomReady = () => {
      console.log(`Webview for ${plugin.id} is ready.`);
      setIsWebviewReady(true);
    };

    webview.addEventListener('dom-ready', handleDomReady);
    
    // Also listen for crashes
    const handleCrash = (e) => {
        console.error(`Webview for ${plugin.id} has crashed.`, e);
    }
    webview.addEventListener('crashed', handleCrash);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('crashed', handleCrash);
    };
  }, [plugin.id, preloadPath]);

  const handleRefresh = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  const openWebviewDevTools = () => {
    if (webviewRef.current && isWebviewReady) {
      webviewRef.current.openDevTools();
    } else {
      console.warn("Webview is not ready yet. Please wait a moment and try again.");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      <div className="flex items-center justify-between bg-gray-800 p-2 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-white">{plugin.manifest.name}</h2>
        <div className="flex items-center gap-2">
          {plugin.manifest.settings && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              title="Plugin Settings"
              className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md"
            >
              <CogIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleRefresh}
            title="Refresh Plugin"
            className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md"
          >
            <RefreshIcon className="h-5 w-5" />
          </button>
          <button
            onClick={openWebviewDevTools}
            title="Open Plugin DevTools"
            className="p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md"
          >
            <CommandLineIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-grow w-full h-full bg-gray-900">
        {preloadPath ? (
          <webview
            ref={webviewRef}
            src={pluginPath}
            className="w-full h-full"
            nodeintegration="false"
          ></webview>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Initializing plugin environment...</p>
          </div>
        )}
      </div>
      
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title={`${plugin.manifest.name} Settings`}
      >
        <PluginSettings plugin={plugin} />
      </Modal>
    </div>
  );
}

export default PluginView;