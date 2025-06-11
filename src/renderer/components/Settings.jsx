import React, { useState, useEffect, useCallback } from 'react';

const ArrowIcon = ({ direction = 'up' }) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'up' 
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        }
    </svg>
);


const DatabaseManager = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableContent, setTableContent] = useState(null);
    const [error, setError] = useState('');

    const fetchTables = useCallback(async () => {
        try {
            const tableList = await window.electronAPI.dbGetAllTables();
            setTables(tableList);
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const handleViewTable = async (tableName) => {
        try {
            setError('');
            const content = await window.electronAPI.dbGetTableContent(tableName);
            setSelectedTable(tableName);
            setTableContent(content);
        } catch (e) {
            setError(e.message);
            setTableContent(null);
        }
    };
    
    const handleDropTable = async (tableName) => {
        if(confirm(`Are you sure you want to permanently drop the table '${tableName}'?`)) {
            try {
                await window.electronAPI.dbDropTable(tableName);
                await fetchTables(); // Refresh list
                setSelectedTable(null);
                setTableContent(null);
            } catch (e) {
                setError(e.message);
            }
        }
    }

    const handleDeleteRow = async (tableName, rowId) => {
         if(confirm(`Are you sure you want to delete row ${rowId} from '${tableName}'?`)) {
            try {
                await window.electronAPI.dbDeleteRow(tableName, rowId);
                await handleViewTable(tableName); // Refresh content
            } catch (e) {
                setError(e.message);
            }
        }
    }

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mt-8">
            <h2 className="text-3xl font-bold text-white mb-6">Database Manager</h2>
            {error && <div className="bg-red-900 border border-red-700 text-white p-3 rounded-md mb-4">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Table List */}
                <div className="md:col-span-1">
                    <h3 className="font-bold text-lg mb-2">Tables</h3>
                    <ul className="space-y-2">
                        {tables.map(table => (
                            <li key={table} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                                <span className={`font-mono ${selectedTable === table ? 'text-indigo-400 font-bold' : ''}`}>{table}</span>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleViewTable(table)} className="px-2 py-1 text-xs bg-indigo-600 rounded hover:bg-indigo-700">View</button>
                                    <button onClick={() => handleDropTable(table)} className="px-2 py-1 text-xs bg-rose-600 rounded hover:bg-rose-700">Drop</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Table Content */}
                <div className="md:col-span-2">
                     <h3 className="font-bold text-lg mb-2">
                        {selectedTable ? `Content of '${selectedTable}'` : 'Select a table to view its content'}
                     </h3>
                     {tableContent && (
                        <div className="overflow-auto max-h-96">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-200 uppercase bg-gray-700 sticky top-0">
                                    <tr>
                                        {Object.keys(tableContent[0] || {}).map(key => <th key={key} className="py-2 px-4">{key}</th>)}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableContent.map((row, index) => (
                                        <tr key={row.rowid || index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                            {Object.values(row).map((val, i) => <td key={i} className="py-2 px-4 font-mono">{String(val)}</td>)}
                                            <td className="py-2 px-4">
                                                <button onClick={() => handleDeleteRow(selectedTable, row.rowid)} className="px-2 py-1 text-xs bg-rose-800 rounded hover:bg-rose-700">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {tableContent.length === 0 && <p className="text-center p-4">Table is empty.</p>}
                        </div>
                     )}
                </div>
            </div>
        </div>
    )
}


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
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            {/* Database Manager */}
            <DatabaseManager />
        </div>
    );
};

export default Settings;