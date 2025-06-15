import React, { useState, useEffect } from 'react';

function Settings({ settings, onSettingsChange }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableContent, setTableContent] = useState([]);

  // Fetch all database tables on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tableList = await window.electronAPI.getAllTables();
        setTables(tableList);
      } catch (error) {
        console.error("Failed to fetch database tables:", error);
      }
    };
    fetchTables();
  }, []);

  // Fetch content when a table is selected
  useEffect(() => {
    if (selectedTable) {
      const fetchContent = async () => {
        try {
          const content = await window.electronAPI.getTableContent(selectedTable);
          setTableContent(content);
        } catch (error) {
          console.error(`Failed to fetch content for table ${selectedTable}:`, error);
          setTableContent([]);
        }
      };
      fetchContent();
    } else {
      setTableContent([]);
    }
  }, [selectedTable]);

  return (
    <div className="p-6 h-full flex flex-col text-white overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6">Global Settings</h2>
      
      {/* Global application settings */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-white">Application</h3>
        <div className="mt-4">
          <label className="block text-gray-300">Theme</label>
          <select
            className="w-full max-w-xs mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={settings.theme || 'dark'}
            onChange={(e) => onSettingsChange({ ...settings, theme: e.target.value })}
          >
            <option value="dark">Dark</option>
            <option value="light" disabled>Light (Coming Soon)</option>
          </select>
        </div>
      </div>

      {/* Database Management */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-white">Database Management</h3>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/3">
            <h4 className="font-bold text-gray-300 mb-2">Tables ({tables.length})</h4>
            <ul className="bg-gray-900 rounded-md p-2 h-96 overflow-y-auto">
              {tables && tables.map((table) => (
                <li
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`p-2 rounded-md cursor-pointer ${
                    selectedTable === table ? 'bg-indigo-600' : 'hover:bg-gray-700'
                  }`}
                >
                  {table}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:w-2/3">
            <h4 className="font-bold text-gray-300 mb-2">
              Content: <span className="text-indigo-400">{selectedTable || 'No table selected'}</span>
            </h4>
            <div className="bg-gray-900 rounded-md p-2 h-96 overflow-auto">
              {tableContent.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr>
                      {Object.keys(tableContent[0]).map(key => (
                        <th key={key} className="p-2 border-b border-gray-700">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableContent.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-800">
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="p-2 border-b border-gray-700 truncate max-w-xs">{String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 p-4">{selectedTable ? 'No content found.' : 'Select a table to view its content.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;