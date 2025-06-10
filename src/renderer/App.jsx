import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/dashboard'
import Settings from './components/Settings'
import PluginView from './components/PluginView'

function App() {
  const [sidebarPlugins, setSidebarPlugins] = useState([])
  const [widgetPlugins, setWidgetPlugins] = useState([])
  const [activeView, setActiveView] = useState({ type: 'dashboard', id: 'dashboard' })
  const [userName, setUserName] = useState('')

  // This function now loads and sorts both lists independently
  const loadPluginData = useCallback(async () => {
    const allPlugins = await window.electronAPI.getPlugins();

    // --- Handle Sidebar Order ---
    const sidebarOrderJson = await window.electronAPI.getGlobalSetting('sidebarOrder');
    let sortedSidebar = [...allPlugins]; // Start with default order
    if (sidebarOrderJson) {
      try {
        const savedOrder = JSON.parse(sidebarOrderJson);
        const pluginMap = new Map(allPlugins.map(p => [p.id, p]));
        sortedSidebar = savedOrder.map(id => pluginMap.get(id)).filter(Boolean);
        allPlugins.forEach(p => {
          if (!savedOrder.includes(p.id)) sortedSidebar.push(p);
        });
      } catch (e) { console.error("Failed to parse sidebar order.", e); }
    }
    setSidebarPlugins(sortedSidebar);

    // --- Handle Widget Order ---
    const potentialWidgets = allPlugins.filter(p => p.manifest.widget);
    const widgetOrderJson = await window.electronAPI.getGlobalSetting('widgetOrder');
    let sortedWidgets = [...potentialWidgets]; // Start with default order
    if (widgetOrderJson) {
      try {
        const savedOrder = JSON.parse(widgetOrderJson);
        const widgetMap = new Map(potentialWidgets.map(p => [p.id, p]));
        sortedWidgets = savedOrder.map(id => widgetMap.get(id)).filter(Boolean);
        potentialWidgets.forEach(p => {
          if (!savedOrder.includes(p.id)) sortedWidgets.push(p);
        });
      } catch (e) { console.error("Failed to parse widget order.", e); }
    }
    setWidgetPlugins(sortedWidgets);

  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
        const name = await window.electronAPI.getGlobalSetting('userName');
        setUserName(name || '');
    };
    loadPluginData();
    fetchUserName();
  }, [loadPluginData]);


  const renderActiveView = () => {
    // Find the currently viewed plugin from the sidebar's sorted list
    const currentPlugin = sidebarPlugins.find(p => p.id === activeView.id);

    switch (activeView.type) {
      case 'dashboard':
        return <Dashboard userName={userName} potentialWidgets={widgetPlugins} />;
      case 'plugin':
        return currentPlugin ? <PluginView plugin={currentPlugin} key={currentPlugin.id} /> : <div>Plugin not found</div>;
      case 'settings':
        return <Settings 
                  currentName={userName} 
                  onNameChange={setUserName} 
                  sidebarPlugins={sidebarPlugins}
                  widgetPlugins={widgetPlugins}
                  onOrderSave={loadPluginData} 
                />;
      default:
        return <Dashboard userName={userName} potentialWidgets={widgetPlugins} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <div className="title-bar"></div>
      <Sidebar plugins={sidebarPlugins} activeViewId={activeView.id} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden pt-8">
        <main className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;