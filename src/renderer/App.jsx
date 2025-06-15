import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PluginView from './components/PluginView';
import Dashboard from './components/dashboard';
import Settings from './components/Settings';
import ToastContainer from './components/ToastContainer';
import { showToast } from './utils/toast';

function App() {
  const [plugins, setPlugins] = useState([]);
  const [activePlugin, setActivePlugin] = useState('dashboard');
  const [settings, setSettings] = useState({});

  const loadSettings = async () => {
    try {
      const theme = await window.electronAPI.getGlobalSetting('theme');
      const someOtherSetting = await window.electronAPI.getGlobalSetting('someOtherSetting');
      const notesPluginSettings = await window.electronAPI.getPluginSettings('notes-plugin');

      setSettings({
        theme: theme || 'dark',
        someOtherSetting: someOtherSetting || 'default value',
        notesPlugin: notesPluginSettings
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings.', { type: 'error' });
    }
  };

  useEffect(() => {
    const fetchPlugins = async () => {
      const loadedPlugins = await window.electronAPI.getPlugins();
      setPlugins(loadedPlugins);
    };

    fetchPlugins();
    loadSettings();

    const cleanup = window.electronAPI.onShowToast((options) => {
      showToast(options.message, options);
    });

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  const handlePluginSelect = (pluginId) => {
    setActivePlugin(pluginId);
  };

  const renderActiveView = () => {
    if (activePlugin === 'dashboard') {
      return <Dashboard plugins={plugins} />;
    }
    if (activePlugin === 'settings') {
      return <Settings settings={settings} onSettingsChange={loadSettings} plugins={plugins} />;
    }
    const plugin = plugins.find((p) => p.id === activePlugin);
    // FIX: Add a unique 'key' prop to PluginView to force remount on change.
    return plugin ? <PluginView key={plugin.id} plugin={plugin} /> : <div>Plugin not found</div>;
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <ToastContainer />
      <Sidebar
        plugins={plugins}
        setActiveView={handlePluginSelect}
        activeView={activePlugin}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        {renderActiveView()}
      </main>
    </div>
  );
}

export default App;