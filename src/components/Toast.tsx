import { useState, useEffect, useCallback, ReactNode } from 'react';
import { ToastContext, type ToastType } from './toast-context';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const styles: Record<ToastType, string> = {
    success: 'bg-[#0D9488] text-white',
    error: 'bg-[#DC2626] text-white',
    info: 'bg-[#1A1A2E] text-white dark:bg-[#334155]',
    warning: 'bg-[#D97706] text-white',
  };

  const icons: Record<ToastType, string> = {
    success: 'OK',
    error: 'ERR',
    info: 'INFO',
    warning: 'WARN',
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${styles[toast.type]} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className="text-xs font-bold shrink-0">{icons[toast.type]}</span>
      <span className="text-sm">{toast.message}</span>
    </div>
  );
}
