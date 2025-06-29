import React, { useState, useEffect } from 'react';

const Widget = ({ plugin }) => {
  const [preloadPath, setPreloadPath] = useState('');

  // Fetch the preload path when the component mounts
  useEffect(() => {
    const fetchPreloadPath = async () => {
      try {
        const path = await window.electronAPI.utils.getPreloadPath();
        setPreloadPath(path);
      } catch (error) {
        console.error("Failed to get preload path for widget:", error);
      }
    };
    fetchPreloadPath();
  }, []);

  const widgetPath = `file://${plugin.path}/${plugin.manifest.widget}`;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-3 bg-indigo-600 text-white font-bold flex justify-between items-center">
        {plugin.manifest.name}
      </div>
      <div className="h-48">
        {preloadPath ? (
            <webview
              src={widgetPath}
              className="w-full h-full"
              style={{ backgroundColor: 'transparent' }}
              nodeintegration="false"
              preload={`file://${preloadPath}`}
            ></webview>
        ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
                <p>Loading...</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Widget;