import React from 'react';
import { CogIcon, Squares2X2Icon } from '@heroicons/react/24/solid';

function Sidebar({ plugins, activeView, setActiveView }) {
  const getIcon = (iconName) => {
    // In a real app, you'd have a mapping of icon names to actual icon components.
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
      </svg>
    );
  };

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-white">
      <div className="flex items-center justify-center h-16 bg-gray-900 flex-shrink-0">
        <span className="text-white font-bold uppercase">Command Center</span>
      </div>

      {/* Main navigation area - scrollable */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setActiveView('dashboard'); }}
          className={`flex items-center px-4 py-2 hover:bg-gray-700 rounded-md ${
            activeView === 'dashboard' ? 'bg-indigo-600' : ''
          }`}
        >
          <Squares2X2Icon className="h-6 w-6 mr-3" />
          Dashboard
        </a>
        {plugins.map((plugin) => (
          <a
            key={plugin.id}
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveView(plugin.id); }}
            className={`flex items-center px-4 py-2 mt-2 hover:bg-gray-700 rounded-md ${
              activeView === plugin.id ? 'bg-indigo-600' : ''
            }`}
          >
            {getIcon(plugin.manifest.icon)}
            <span className="mx-4 font-medium">{plugin.manifest.name}</span>
          </a>
        ))}
      </nav>

      {/* Bottom-aligned settings button */}
      <div className="px-2 py-4 mt-auto flex-shrink-0">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setActiveView('settings'); }}
          className={`flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700 rounded-md ${
            activeView === 'settings' ? 'bg-gray-700' : ''
          }`}
        >
          <CogIcon className="h-6 w-6 mr-3" />
          Settings
        </a>
      </div>
    </div>
  );
}

export default Sidebar;