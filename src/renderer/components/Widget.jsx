import React from 'react';

const Widget = ({ plugin }) => {
  const widgetPath = `file://${plugin.path}/${plugin.manifest.widget}`;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-3 bg-indigo-600 text-white font-bold flex justify-between items-center">
        {plugin.manifest.name}
      </div>
      <div className="h-48"> 
        <webview
          src={widgetPath}
          className="w-full h-full"
          style={{ backgroundColor: 'transparent' }} // Make webview transparent
        ></webview>
      </div>
    </div>
  );
};

export default Widget;