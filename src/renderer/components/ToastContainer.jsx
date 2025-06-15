import React from 'react';
import Toast from './Toast';

const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-10 right-0 z-50 p-4 w-full max-w-xs">
      <div className="flex flex-col items-end space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;