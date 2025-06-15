import React, { useState, useEffect } from 'react';

function PluginSettings({ plugin, onRegenerate }) {
  const [settings, setSettings] = useState({});
  const [originalSettings, setOriginalSettings] = useState({});

  useEffect(() => {
    const loadSettings = async () => {
      const currentSettings = await window.electronAPI.getPluginSettings(plugin.id);
      setSettings(currentSettings);
      setOriginalSettings(currentSettings);
    };
    loadSettings();
  }, [plugin.id]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    try {
      await window.electronAPI.setPluginSetting(plugin.id, key, settings[key]);
      setOriginalSettings(prev => ({ ...prev, [key]: settings[key] }));
      // Optionally show a success toast
    } catch (error) {
      console.error(`Failed to save setting ${key} for plugin ${plugin.id}:`, error);
      // Optionally show an error toast
    }
  };

  const isChanged = (key) => settings[key] !== originalSettings[key];

  return (
    <div className="text-white">
      <h3 className="text-2xl font-bold mb-4">{plugin.manifest.name} Settings</h3>
      <p className="text-gray-400 mb-6">{plugin.manifest.description}</p>
      
      <div className="space-y-6">
        {plugin.manifest.settings && plugin.manifest.settings.map((setting) => (
          // FIX: Added a unique key to the parent element in the map.
          <div key={setting.name} className="flex flex-col">
            <label htmlFor={setting.name} className="mb-2 font-medium text-gray-300">
              {setting.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={setting.name}
                type={setting.type}
                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={settings[setting.name] || ''}
                onChange={(e) => handleSettingChange(setting.name, e.target.value)}
              />
              {isChanged(setting.name) && (
                <button
                  onClick={() => handleSave(setting.name)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold"
                >
                  Save
                </button>
              )}
            </div>
            {setting.description && (
              <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 border-t border-red-500/30 pt-6">
        <h4 className="text-xl font-semibold text-red-400 mb-2">Danger Zone</h4>
        <div className="flex justify-between items-center bg-red-900/20 p-4 rounded-md">
          <div>
            <p className="font-bold">Regenerate Plugin Tables</p>
            <p className="text-sm text-gray-400">This will delete all data for this plugin and recreate its tables. This action cannot be undone.</p>
          </div>
          <button
            onClick={onRegenerate}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-bold"
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

export default PluginSettings;