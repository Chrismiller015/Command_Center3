import React, { useState, useEffect } from 'react';

const ArrowIcon = ({ direction = 'up' }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'up' 
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        }
    </svg>
);


const Settings = ({ currentName, onNameChange, sidebarPlugins, widgetPlugins, onOrderSave }) => {
    const [name, setName] = useState(currentName);
    const [message, setMessage] = useState('');
    
    const [sidebarOrder, setSidebarOrder] = useState([]);
    const [widgetOrder, setWidgetOrder] = useState([]);

    useEffect(() => {
        setSidebarOrder(sidebarPlugins.map(p => p.id));
        setWidgetOrder(widgetPlugins.map(p => p.id));
    }, [sidebarPlugins, widgetPlugins]);

    const handleSaveName = async () => {
        setMessage('');
        try {
            await window.electronAPI.setGlobalSetting('userName', name);
            onNameChange(name); 
            setMessage({ type: 'success', text: 'Name saved!' });
        } catch (error) {
            console.error('Failed to save name:', error);
            setMessage({ type: 'error', text: 'Failed to save name.' });
        } finally {
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const moveItem = (list, setList, index, direction) => {
        const newOrder = [...list];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newOrder.length) return;
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
        setList(newOrder);
    };

    const handleSaveOrder = async (orderKey, orderToSave) => {
        setMessage('');
        try {
            await window.electronAPI.setGlobalSetting(orderKey, JSON.stringify(orderToSave));
            if (onOrderSave) onOrderSave();
            setMessage({ type: 'success', text: 'Order saved!' });
        } catch (error) {
            console.error(`Failed to save ${orderKey}:`, error);
            setMessage({ type: 'error', text: 'Failed to save order.' });
        } finally {
            setTimeout(() => setMessage(''), 3000);
        }
    }

    return (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Global Settings & Sidebar Order */}
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-6">Global Settings</h1>
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                                <input 
                                    type="text" 
                                    id="name" 
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex items-center justify-end h-6">
                                <button 
                                    onClick={handleSaveName}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500">
                                    Save Name
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white mb-6">Sidebar Menu Order</h2>
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                         <p className="text-gray-400 mb-4">Click the arrows to reorder the plugins in the sidebar menu.</p>
                        <ul className="space-y-2">
                            {sidebarOrder.map((pluginId, index) => {
                                const plugin = sidebarPlugins.find(p => p.id === pluginId);
                                if (!plugin) return null;
                                return (
                                    <li key={pluginId} className="flex items-center justify-between bg-gray-700 p-3 rounded-md text-white">
                                        <span>{plugin.manifest.name}</span>
                                        <div className="flex space-x-2">
                                            <button onClick={() => moveItem(sidebarOrder, setSidebarOrder, index, -1)} disabled={index === 0} className="p-1 rounded-md hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowIcon direction="up" />
                                            </button>
                                            <button onClick={() => moveItem(sidebarOrder, setSidebarOrder, index, 1)} disabled={index === sidebarOrder.length - 1} className="p-1 rounded-md hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowIcon direction="down" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="text-right mt-6">
                            <button onClick={() => handleSaveOrder('sidebarOrder', sidebarOrder)} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                Save Menu Order
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Column 2: Widget Order */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-6">Dashboard Widget Order</h2>
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <p className="text-gray-400 mb-4">Click the arrows to reorder how widgets appear on the dashboard.</p>
                    <ul className="space-y-2">
                         {widgetOrder.map((pluginId, index) => {
                                const plugin = widgetPlugins.find(p => p.id === pluginId);
                                if (!plugin) return null;
                                return (
                                    <li key={pluginId} className="flex items-center justify-between bg-gray-700 p-3 rounded-md text-white">
                                        <span>{plugin.manifest.name} Widget</span>
                                        <div className="flex space-x-2">
                                            <button onClick={() => moveItem(widgetOrder, setWidgetOrder, index, -1)} disabled={index === 0} className="p-1 rounded-md hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowIcon direction="up" />
                                            </button>
                                            <button onClick={() => moveItem(widgetOrder, setWidgetOrder, index, 1)} disabled={index === widgetOrder.length - 1} className="p-1 rounded-md hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowIcon direction="down" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                    </ul>
                     <div className="text-right mt-6">
                        <button onClick={() => handleSaveOrder('widgetOrder', widgetOrder)} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Save Widget Order
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-end h-6 mt-6">
                    {message && (
                            <span className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {message.text}
                            </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;