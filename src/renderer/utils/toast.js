import { toast } from 'react-toastify';

/**
 * Displays a toast notification using the react-toastify library.
 * This function can be imported and used anywhere in the renderer process.
 *
 * @param {string} message The message to display in the toast.
 * @param {object} options Options for the toast (e.g., { type: 'success', autoClose: 5000 }).
 */
export const showToast = (message, options) => {
  // Default options can be set here if desired
  const defaultOptions = {
    position: "bottom-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
  };

  toast(message, { ...defaultOptions, ...options });
};