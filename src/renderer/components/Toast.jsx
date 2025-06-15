import React, { useEffect } from 'react';

// Heroicon imports for the toast icons
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

const toastTypes = {
  success: {
    icon: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
    style: 'bg-green-500',
  },
  error: {
    icon: <XCircleIcon className="w-6 h-6 text-red-400" />,
    style: 'bg-red-500',
  },
  info: {
    icon: <InformationCircleIcon className="w-6 h-6 text-blue-400" />,
    style: 'bg-blue-500',
  },
};

const Toast = ({ toast, onDismiss }) => {
  const { id, type, message } = toast;
  const { icon, style } = toastTypes[type] || toastTypes.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`relative w-full max-w-sm p-4 my-2 text-white rounded-lg shadow-lg bg-gray-800 border border-gray-700 overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${style}`}></div>
      <div className="flex items-start ml-4">
        <div className="flex-shrink-0 pt-0.5">
          {icon}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-100">{message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button onClick={() => onDismiss(id)} className="inline-flex text-gray-400 hover:text-gray-200">
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;