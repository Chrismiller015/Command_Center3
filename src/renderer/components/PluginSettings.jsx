import React, { useState, useEffect, useCallback } from 'react';

const PluginSettings = ({ plugin }) => {
    const [settings, setSettings] = useState({});
    const [dynamicOptions, setDynamicOptions] = useState({});
    const [message, setMessage] = useState('');

    const pluginId = plugin.id;

    const loadInitialData = useCallback(async () => {
        const currentSettings = await window.electronAPI.getPluginSettings(pluginId);
        setSettings(currentSettings);

        // Pre-fetch data for any dynamic fields
        for (const field of plugin.manifest.settings) {
            if (field.type === 'dynamicCheckboxes') {
                const tableName = `plugin_${pluginId.replace(/-/g, '_')}_${field.source.table}`;
                const options = await window.electronAPI.dbAll(pluginId, `SELECT * FROM ${tableName}`);
                setDynamicOptions(prev => ({
                    ...prev,
                    [field.id]: options.map(opt => ({
                        label: opt[field.source.labelColumn],
                        value: opt[field.source.valueColumn],
                        checked: !!opt[field.source.checkedColumn]
                    }))
                }));
            }
        }
    }, [pluginId, plugin.manifest.settings]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);


    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        window.electronAPI.setPluginSetting(pluginId, key, value);
    };

    const handleButtonClick = async (onClickAction) => {
        setMessage('Working...');
        try {
            const [service, method] = onClickAction.split(':');
            const result = await window.electronAPI['plugin:service-call']({
                pluginId: pluginId,
                method: method,
                params: { scopes: plugin.manifest.services[service].scopes }
            });
            setMessage('Success! Data has been fetched. Please close and reopen settings to see changes.');
            loadInitialData(); // Refresh the dynamic data
        } catch (e) {
            console.error(e);
            setMessage(`Error: ${e.message}`);
        }
    };
    
    const handleCheckboxChange = async (onChangeAction, value, checked) => {
        try {
             const [service, method] = onChangeAction.split(':');
             await window.electronAPI['plugin:service-call']({
                pluginId,
                method,
                params: { calendarId: value, isSynced: checked }
            });
             // Refresh the options to show the change
             loadInitialData();
        } catch(e) {
             console.error(e);
             setMessage(`Error: ${e.message}`);
        }
    }

    const renderField = (field) => {
        const value = settings[field.key] || '';
        switch (field.type) {
            case 'password':
            case 'text':
                return (
                    <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                        <input type={field.type} value={value}
                            onChange={e => handleSettingChange(field.key, e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" />
                    </div>
                );
            case 'dynamicCheckboxes':
                const options = dynamicOptions[field.id] || [];
                return (
                    <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-300">{field.name}</label>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-900/50 rounded-md">
                            {options.length > 0 ? options.map(option => (
                                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={option.checked}
                                        onChange={(e) => handleCheckboxChange(field.onChange, option.value, e.target.checked)}
                                        className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-indigo-600"/>
                                    <span className="text-gray-200">{option.label}</span>
                                </label>
                            )) : <p className="text-gray-500 text-sm">No options available. Try clicking the fetch/login button.</p>}
                        </div>
                    </div>
                );
            case 'button':
                return (
                    <div key={field.id} className="pt-2">
                        <button onClick={() => handleButtonClick(field.onClick)}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            {field.name}
                        </button>
                    </div>
                );
            default:
                return <p key={field.id}>Unsupported field type: {field.type}</p>;
        }
    };

    return (
        <div className="space-y-6">
            {plugin.manifest.settings.map(field => renderField(field))}
            <p className="text-sm text-gray-400 h-4 mt-2">{message}</p>
        </div>
    );
};

export default PluginSettings;