import toast, { Toaster, ToastOptions } from 'react-hot-toast';

// Default toast options
const defaultOptions: ToastOptions = {
  duration: 4000,
  position: 'top-center',
  style: {
    background: '#1f2937',
    color: '#f3f4f6',
    borderRadius: '0.5rem',
    padding: '1rem',
    fontSize: '0.875rem',
  },
};

// Success toast
export const showSuccess = (message: string, options?: ToastOptions) => {
  return toast.success(message, {
    ...defaultOptions,
    ...options,
    icon: '✅',
  });
};

// Error toast
export const showError = (message: string, options?: ToastOptions) => {
  return toast.error(message, {
    ...defaultOptions,
    ...options,
    icon: '❌',
  });
};

// Info toast
export const showInfo = (message: string, options?: ToastOptions) => {
  return toast(message, {
    ...defaultOptions,
    ...options,
    icon: 'ℹ️',
  });
};

// Warning toast
export const showWarning = (message: string, options?: ToastOptions) => {
  return toast(message, {
    ...defaultOptions,
    ...options,
    icon: '⚠️',
    style: {
      ...defaultOptions.style,
      background: '#f59e0b',
      color: '#1f2937',
    },
  });
};

// Loading toast
export const showLoading = (message: string, options?: ToastOptions) => {
  return toast.loading(message, {
    ...defaultOptions,
    ...options,
  });
};

// Promise toast (for async operations)
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  },
  options?: ToastOptions
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      ...defaultOptions,
      ...options,
    }
  );
};

// Dismiss toast
export const dismissToast = (toastId?: string) => {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
};

// Export Toaster component for use in App
export { Toaster };

// Export default toast for custom usage
export default toast;
