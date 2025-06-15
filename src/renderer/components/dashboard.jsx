import React, { useState, useEffect } from 'react';
import Widget from './Widget';
import Clock from './clock';

function Dashboard({ plugins }) {
  const [enabledWidgets, setEnabledWidgets] = useState({});

  useEffect(() => {
    // FIX: Add a guard clause.
    // This ensures the code doesn't run until the `plugins` prop is a valid array.
    if (!plugins || plugins.length === 0) {
      return;
    }

    const loadEnabledState = async () => {
      try {
        const initialEnabledState = {};
        for (const plugin of plugins) {
          if (plugin.widget) {
            // Use the correct API to get plugin-specific settings
            const settings = await window.electronAPI.getPluginSettings(plugin.id);
            initialEnabledState[plugin.id] = settings?.dashboard_widget_enabled === 'true' || false;
          }
        }
        setEnabledWidgets(initialEnabledState);
      } catch (error) {
        console.error("Error loading widget enabled state:", error);
      }
    };

    loadEnabledState();
  }, [plugins]); // Add plugins as a dependency to re-run when they are loaded.

  const toggleWidget = async (pluginId) => {
    const newState = !enabledWidgets[pluginId];
    try {
      // Use the correct API to set the new state
      await window.electronAPI.setPluginSetting(pluginId, 'dashboard_widget_enabled', newState.toString());
      setEnabledWidgets(prevState => ({
        ...prevState,
        [pluginId]: newState,
      }));
    } catch (error) {
      console.error(`Error toggling widget for ${pluginId}:`, error);
    }
  };

  const widgetPlugins = plugins.filter(p => p.widget);

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Clock is always displayed */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col justify-center items-center text-white">
          <Clock />
        </div>

        {/* Render widgets for plugins that have one and are enabled */}
        {widgetPlugins.map(plugin => (
          enabledWidgets[plugin.id] && (
            <Widget key={plugin.id} plugin={plugin} />
          )
        ))}
      </div>
    </div>
  );
}

export default Dashboard;