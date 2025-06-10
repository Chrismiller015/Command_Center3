import React, { useState, useEffect } from 'react'
import Modal from './Modal'

const PluginView = ({ plugin }) => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false)
  const [isRegenModalOpen, setRegenModalOpen] = useState(false)
  const [settings, setSettings] = useState({})

  const pluginIndexPath = plugin.entryPointPath

  const canBeWidget = !!plugin.manifest.widget

  const handleOpenSettings = async () => {
    const currentSettings = await window.electronAPI.getPluginSettings(plugin.id)
    setSettings(currentSettings)
    setSettingsModalOpen(true)
  }

  const handleSettingChange = (key, value) => {
    // Update local state immediately for responsiveness
    setSettings((prev) => ({ ...prev, [key]: value }))
    // Save to database in the background
    window.electronAPI.setPluginSetting(plugin.id, key, value)
  }

  const handleRegenerate = async () => {
    await window.electronAPI.regenerateTables(plugin.id)
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 bg-gray-800 shadow-md flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold text-white">{plugin.manifest.name}</h1>
        <button onClick={handleOpenSettings} className="p-2 rounded-full hover:bg-gray-700">
          <img src="./icons/cog.svg" alt="Settings" className="w-6 h-6" />
        </button>
      </header>
      <div className="flex-1 bg-gray-900">
        <webview
          src={pluginIndexPath}
          className="w-full h-full"
          style={{ backgroundColor: '#111827' }}
        ></webview>
      </div>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} title={`${plugin.manifest.name} Settings`}>
        <div className="space-y-4">
          {/* RENDER WIDGET TOGGLE IF APPLICABLE */}
          {canBeWidget && (
             <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <label htmlFor="widgetToggle" className="font-medium text-white">Add Widget to Dashboard</label>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            id="widgetToggle" 
                            className="sr-only peer" 
                            checked={settings.widgetEnabled || false}
                            onChange={(e) => handleSettingChange('widgetEnabled', e.target.checked)}
                        />
                        <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-full peer-checked:bg-indigo-400"></div>
                    </div>
                </label>
             </div>
          )}

          {/* RENDER OTHER PLUGIN-SPECIFIC SETTINGS */}
          {plugin.manifest.settings && plugin.manifest.settings.map((setting) => (
            <div key={setting.key}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{setting.label}</label>
              <input
                type={setting.type || 'text'}
                value={settings[setting.key] || ''}
                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
              />
            </div>
          ))}
          {(!plugin.manifest.settings || plugin.manifest.settings.length === 0) && !canBeWidget && (
            <p className="text-gray-400">This plugin has no configurable settings.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end items-center">
            <button
              onClick={() => {
                setSettingsModalOpen(false)
                setRegenModalOpen(true)
              }}
              className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 mr-auto"
            >
              Regenerate Table
            </button>
            <button
                onClick={() => setSettingsModalOpen(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Done
            </button>
        </div>
      </Modal>

      <Modal isOpen={isRegenModalOpen} onClose={() => setRegenModalOpen(false)} title="Are you sure?">
        {/* ... Regenerate modal content remains the same ... */}
        <p>This will permanently delete all data for this plugin and restart the app.</p>
        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={() => setRegenModalOpen(false)} className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500">
            Cancel
          </button>
          <button onClick={handleRegenerate} className="px-6 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700">
            Confirm & Restart
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default PluginView