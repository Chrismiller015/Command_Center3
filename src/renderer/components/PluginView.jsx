import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Form from './Form';

import { Cog6ToothIcon, BugAntIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCalendarDays, faGear, faBug, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

const IconComponents = {
    SettingsIcon: Cog6ToothIcon,
    DebugIcon: BugAntIcon,
    'fa-solid-calendar-days': (props) => <FontAwesomeIcon icon={faCalendarDays} {...props} className="pointer-events-none" />,
    'fa-solid-right-from-bracket': (props) => <FontAwesomeIcon icon={faRightFromBracket} {...props} className="pointer-events-none" />,
    'fa-solid-plus': (props) => <FontAwesomeIcon icon={faPlus} {...props} className="pointer-events-none" />,
    'fa-solid-gear': (props) => <FontAwesomeIcon icon={faGear} {...props} className="pointer-events-none" />,
    'fa-solid-bug': (props) => <FontAwesomeIcon icon={faBug} {...props} className="pointer-events-none" />,
};

const PluginView = ({ plugin }) => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const webviewRef = useRef(null);

  const handleOpenSettings = async () => {
    const currentSettings = await window.electronAPI.getPluginSettings(plugin.id);
    setSettings(currentSettings);
    setInitialSettings(currentSettings);
    setSettingsModalOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsModalOpen(false);
    // After closing, check if critical credentials have changed
    if (
        (settings.googleClientId && settings.googleClientId !== initialSettings.googleClientId) ||
        (settings.googleClientSecret && settings.googleClientSecret !== initialSettings.googleClientSecret)
    ) {
        console.log("Credentials changed. Reloading plugin to trigger auth check.");
        webviewRef.current?.reload();
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    window.electronAPI.setPluginSetting(plugin.id, key, value);
  };
  
  const handleRegenerate = async () => {
    if (window.confirm("Are you sure? This will delete all plugin data and restart the app.")) {
        await window.electronAPI.regenerateTables(plugin.id);
    }
  };

  const openWebviewDevTools = () => webviewRef.current?.openDevTools();

  const handlePluginButtonAction = async (action) => {
      try {
          if (action.type === 'openModal') {
              await window.electronAPI.openPluginSpecificModal({ pluginId: plugin.id, modalType: action.modalType });
          } else if (action.type === 'serviceMethod') {
              await window.electronAPI['plugin:service-call']({
                  pluginId: plugin.id,
                  method: action.methodName,
                  params: action.params 
              });
              webviewRef.current?.reload();
          }
      } catch (error) {
          console.error(`Error executing plugin button action for ${plugin.id}:`, error);
          alert(`Error: ${error.message}`);
      }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 bg-gray-800 shadow-md flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold text-white">{plugin.manifest.name}</h1>
        <div className="flex items-center space-x-2">
            {plugin.manifest.pluginButtons?.map((buttonDef) => {
                const IconComponent = IconComponents[buttonDef.icon];
                return IconComponent ? (
                    <button key={buttonDef.id} onClick={() => handlePluginButtonAction(buttonDef.action)} title={buttonDef.tooltip || buttonDef.label} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                        <IconComponent className="w-6 h-6" />
                    </button>
                ) : null;
            })}
            <button onClick={openWebviewDevTools} title="Open Plugin DevTools" className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                <IconComponents.DebugIcon className="w-6 h-6" />
            </button>
            <button onClick={handleOpenSettings} title="Plugin Settings" className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
              <IconComponents.SettingsIcon className="w-6 h-6" />
            </button>
        </div>
      </header>
      <div className="flex-1 bg-gray-900">
        <webview ref={webviewRef} src={plugin.entryPointPath} className="w-full h-full" style={{ backgroundColor: '#111827' }} nodeintegration="true" />
      </div>

      <Modal isOpen={isSettingsModalOpen} onClose={handleCloseSettings} title={`${plugin.manifest.name} Settings`}>
        {plugin.manifest.settings && plugin.manifest.settings.length > 0 ? (
            <>
              <Form
                  schema={plugin.manifest.settings}
                  formData={settings}
                  onFormChange={handleSettingChange}
              />
              <div className="text-right mt-6">
                <button onClick={handleCloseSettings} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500">
                    Done
                </button>
              </div>
            </>
        ) : (
            <p className="text-gray-400">This plugin has no configurable settings.</p>
        )}
        <div className="mt-8 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold text-white mb-2">Danger Zone</h3>
            <p className="text-gray-400 text-sm mb-4">This will delete all data for this plugin and restart the application.</p>
            <button onClick={handleRegenerate} className="px-6 py-2 bg-rose-700 text-white rounded-md hover:bg-rose-800 focus:outline-none">
                Regenerate Tables
            </button>
        </div>
      </Modal>
    </div>
  )
}

export default PluginView;