import { useState, useEffect, useCallback } from 'react';

// 跨组件同步：当同一 key 的 localStorage 值变化时，通知所有订阅者
type Listener = (key: string) => void;
const listeners: Listener[] = [];

function notifyListeners(key: string) {
  listeners.forEach(fn => fn(key));
}

/** 订阅 localStorage key 变化（来自同页面其他组件或同步操作） */
export function onLocalStorageChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/** 通知所有 useLocalStorage 实例：指定 key 的数据已更新 */
export function refreshLocalStorageKey(key: string): void {
  notifyListeners(key);
}

/** 通知所有 useLocalStorage 实例：全部 key 可能已更新（同步后调用） */
export function refreshAllLocalStorage(): void {
  notifyListeners('*');
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) return JSON.parse(item) as T;
    } catch { /* ignore */ }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // localStorage 满或禁用，静默失败
    }
  }, [key, storedValue]);

  // 监听同页面其他组件/同步操作对 localStorage 的更新
  useEffect(() => {
    const unsub = onLocalStorageChange((changedKey) => {
      if (changedKey === '*' || changedKey === key) {
        try {
          const item = localStorage.getItem(key);
          const newValue = item !== null ? JSON.parse(item) as T : typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
          setStoredValue(newValue);
        } catch { /* ignore */ }
      }
    });
    return unsub;
  }, [key, initialValue]);

  // 监听其他 Tab/窗口对 localStorage 的更新（storage 事件仅在同源不同 Tab 间触发）
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        try {
          const item = localStorage.getItem(key);
          const newValue = item !== null ? JSON.parse(item) as T : typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
          setStoredValue(newValue);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  // 包装 setter：写入 localStorage 后通知其他组件
  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback((value) => {
    setStoredValue(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      // 写入 localStorage（effect 也会写，但这里提前写保证同步读取）
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch { /* ignore */ }
      // 通知同页面其他 useLocalStorage 实例
      notifyListeners(key);
      return newValue;
    });
  }, [key]);

  return [storedValue, setValue];
}
