import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 在 Provider 外使用时返回空函数，不报错
    return { showToast: (_msg: string, _type?: ToastType) => {} };
  }
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    // 3秒后自动消失
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast 容器 */}
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
    // 触发进入动画
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const styles: Record<ToastType, string> = {
    success: 'bg-[#0D9488] text-white',
    error: 'bg-[#DC2626] text-white',
    info: 'bg-[#1A1A2E] text-white dark:bg-[#334155]',
    warning: 'bg-[#D97706] text-white',
  };

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${styles[toast.type]} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <span className="text-base font-bold shrink-0">{icons[toast.type]}</span>
      <span className="text-sm">{toast.message}</span>
    </div>
  );
}
