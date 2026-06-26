import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: (_msg: string, _type?: ToastType) => {} };
  }
  return ctx;
}
