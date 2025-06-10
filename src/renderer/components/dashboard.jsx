import React, { useState, useEffect } from 'react';
import Clock from './Clock';
import Widget from './Widget';

// It now receives 'potentialWidgets', which is pre-sorted and filtered
const Dashboard = ({ userName, potentialWidgets }) => {
    const [enabledWidgets, setEnabledWidgets] = useState([]);

    useEffect(() => {
        const loadEnabledState = async () => {
            if (potentialWidgets.length === 0) {
                setEnabledWidgets([]);
                return;
            }

            // For the given potential widgets, check which ones are actually enabled
            const settingsPromises = potentialWidgets.map(p => 
                window.electronAPI.getPluginSettings(p.id)
            );
            const allSettings = await Promise.all(settingsPromises);

            const widgetsToDisplay = potentialWidgets.filter((plugin, index) => {
                return !!allSettings[index].widgetEnabled;
            });
            
            setEnabledWidgets(widgetsToDisplay);
        };

        loadEnabledState();
    }, [potentialWidgets]); // Re-check which widgets are enabled if the potential list changes

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="p-6">
            <h1 className="text-4xl font-bold text-white mb-2">{getGreeting()}{userName ? `, ${userName}` : ''}!</h1>
            <p className="text-lg text-gray-400 mb-8">Welcome to your Command Center dashboard.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 md:col-span-2">
                    <Clock />
                </div>
                
                {/* Widgets will now render in the user-defined order */}
                {enabledWidgets.map(plugin => (
                    <Widget key={plugin.id} plugin={plugin} />
                ))}
            </div>
        </div>
    );
};

export default Dashboard;