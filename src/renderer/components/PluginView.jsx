import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';

// --- Heroicons Imports ---
import { Cog6ToothIcon, BugAntIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
// Example of another Heroicon you might want to add:
// import { PlusIcon as HeroPlusIcon } from '@heroicons/react/24/outline';


// --- Font Awesome Imports ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCalendarDays, faGear, faBug } from '@fortawesome/free-solid-svg-icons';
// You would import specific icons you want to use from free-solid-svg-icons, free-regular-svg-icons, etc.
// Example: import { faStar } from '@fortawesome/free-solid-svg-icons';


// --- Icon Component Mapping ---
// This central object maps string names from manifest.json to actual React icon components.
const IconComponents = {
    // Default/Heroicons (using Heroicons names directly for simplicity)
    SettingsIcon: Cog6ToothIcon, // Renamed for clarity from Cog6ToothIcon
    DebugIcon: BugAntIcon,       // Renamed for clarity from BugAntIcon
    CalendarIcon: CalendarDaysIcon, // Renamed for clarity from CalendarDaysIcon
    // Heroicons (if you want to add more later, e.g., 'HeroPlusIcon': HeroPlusIcon)

    // Font Awesome Icons (prefixed with 'fa-' for clarity in manifest)
    'fa-solid-plus': (props) => <FontAwesomeIcon icon={faPlus} {...props} />,
    'fa-solid-calendar-days': (props) => <FontAwesomeIcon icon={faCalendarDays} {...props} />,
    'fa-solid-gear': (props) => <FontAwesomeIcon icon={faGear} {...props} />,
    'fa-solid-bug': (props) => <FontAwesomeIcon icon={faBug} {...props} />,
    // Add more Font Awesome icons as needed, e.g.:
    // 'fa-solid-star': (props) => <FontAwesomeIcon icon={faStar} {...props} />,
};


const PluginView = ({ plugin }) => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isRegenModalOpen, setRegenModalOpen] = useState(false); 
  const [settings, setSettings] = useState({});
  const webviewRef = useRef(null);

  const pluginIndexPath = plugin.entryPointPath;

  const handleOpenSettings = async () => {
    const currentSettings = await window.electronAPI.getPluginSettings(plugin.id);
    setSettings(currentSettings);
    setSettingsModalOpen(true);
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    window.electronAPI.setPluginSetting(plugin.id, key, value);
  };

  const handleRegenerate = async () => {
    if (window.confirm("Are you sure you want to regenerate tables for this plugin? All plugin data will be lost and the app will restart.")) {
        await window.electronAPI.regenerateTables(plugin.id);
    }
  };

  const openWebviewDevTools = () => {
    if (webviewRef.current) {
      webviewRef.current.openDevTools();
    }
  };

  const handlePluginButtonAction = async (actionDefinition) => {
      try {
          if (actionDefinition.type === 'openModal') {
              await window.electronAPI.openPluginSpecificModal({ 
                  pluginId: plugin.id, 
                  modalType: actionDefinition.modalType 
              });
          } else if (actionDefinition.type === 'serviceMethod') {
              const result = await window.electronAPI['plugin:service-call']({
                  pluginId: plugin.id,
                  method: actionDefinition.methodName,
                  params: actionDefinition.params 
              });
              console.log(`[PluginView] Service method '${actionDefinition.methodName}' for ${plugin.id} returned:`, result);
          }
      } catch (error) {
          console.error(`[PluginView] Error executing plugin button action for ${plugin.id}:`, error);
          alert(`Error performing action: ${error.message}`); 
      }
  };


  return (
    <div className="h-full flex flex-col">
      <header className="p-4 bg-gray-800 shadow-md flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold text-white">{plugin.manifest.name}</h1>
        <div className="flex items-center space-x-2">
            {/* Dynamically render custom plugin buttons */}
            {plugin.manifest.pluginButtons && plugin.manifest.pluginButtons.map((buttonDef) => {
                const IconComponent = IconComponents[buttonDef.icon]; // Get the correct icon component
                if (!IconComponent) {
                    console.warn(`[PluginView] Icon "${buttonDef.icon}" not found for plugin "${plugin.id}".`);
                    return null; // Don't render if icon not found
                }
                return (
                    <button
                        key={buttonDef.id}
                        onClick={() => handlePluginButtonAction(buttonDef.action)}
                        title={buttonDef.tooltip || buttonDef.label}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                        {/* Render the icon component */}
                        <IconComponent className="w-6 h-6" /> 
                    </button>
                );
            })}

            {/* Debug and Settings buttons always present */}
            <button 
                onClick={openWebviewDevTools} 
                title="Open Plugin DevTools"
                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
            >
                <IconComponents.DebugIcon className="w-6 h-6" /> {/* Use mapped icon */}
            </button>
            <button 
                onClick={handleOpenSettings} 
                className="p-2 rounded-full hover:bg-gray-700"
                title="Plugin Settings"
            >
              <IconComponents.SettingsIcon className="w-6 h-6" /> {/* Use mapped icon */}
            </button>
        </div>
      </header>
      <div className="flex-1 bg-gray-900">
        <webview
          ref={webviewRef}
          src={pluginIndexPath}
          className="w-full h-full"
          style={{ backgroundColor: '#111827' }}
          nodeintegration="true" 
        ></webview>
      </div>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} title={`${plugin.manifest.name} Settings`}>
        {plugin.manifest.settings && plugin.manifest.settings.length > 0 ? (
            <div className="space-y-4">
                {plugin.manifest.settings.map((setting) => (
                    setting.type === 'hidden' ? null : (
                        <div key={setting.key}>
                            <label htmlFor={setting.key} className="block text-sm font-medium text-gray-300 mb-1">
                                {setting.label}
                            </label>
                            <input
                                type={setting.type}
                                id={setting.key}
                                value={settings[setting.key] || ''}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )
                ))}
                <div className="text-right mt-4">
                    <button 
                        onClick={() => setSettingsModalOpen(false)}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        ) : (
            <p className="text-gray-400">This plugin has no configurable settings.</p>
        )}
        <div className="mt-6 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold text-white mb-2">Database Management</h3>
            <p className="text-gray-400 text-sm mb-4">
                Use this to reset plugin-specific data if needed. This action will delete all data and restart the application.
            </p>
            <button 
                onClick={handleRegenerate}
                className="px-6 py-2 bg-rose-700 text-white rounded-md hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-rose-600"
            >
                Regenerate Tables
            </button>
        </div>
      </Modal>

      <Modal isOpen={isRegenModalOpen} onClose={() => setRegenModalOpen(false)} title="Are you sure?">
      </Modal>
    </div>
  )
}

export default PluginView;