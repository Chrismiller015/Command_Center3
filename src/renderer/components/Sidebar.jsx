import React from 'react';

// Inline SVG for simplicity
const DashboardIcon = () => <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>;
const SettingsIcon = () => <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;
const PluginIcon = () => <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>;


const Sidebar = ({ plugins, activeViewId, setActiveView }) => {
  const navLinkClasses = "flex items-center p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200 cursor-pointer";
  const activeLinkClasses = "bg-indigo-600 text-white font-semibold";

  return (
    <aside className="bg-gray-800 text-white w-64 flex-shrink-0 flex flex-col pt-8"> {/* pt-8 for title bar */}
      <div className="p-5 text-2xl font-bold border-b border-gray-700">
        Command Center
      </div>
      <nav className="p-3 space-y-2 flex-1">
        {/* Dashboard Link */}
        <div
          className={`${navLinkClasses} ${activeViewId === 'dashboard' ? activeLinkClasses : ''}`}
          onClick={() => setActiveView({ type: 'dashboard', id: 'dashboard' })}
        >
          <DashboardIcon />
          Dashboard
        </div>

        {/* Plugin Links */}
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            className={`${navLinkClasses} ${activeViewId === plugin.id ? activeLinkClasses : ''}`}
            onClick={() => setActiveView({ type: 'plugin', id: plugin.id })}
          >
            <PluginIcon />
            {plugin.manifest.name}
          </div>
        ))}
      </nav>
       {/* Settings Link at the bottom */}
       <div className="p-3 space-y-2 border-t border-gray-700">
        <div
            className={`${navLinkClasses} ${activeViewId === 'settings' ? activeLinkClasses : ''}`}
            onClick={() => setActiveView({ type: 'settings', id: 'settings' })}
        >
            <SettingsIcon />
            Settings
        </div>
       </div>
    </aside>
  );
};

export default Sidebar;