import { useState, useRef, useCallback, useEffect } from 'react';

export interface LongPressMenuItem {
  label: string;
  icon?: string;
  color?: string;
  onClick: () => void;
}

interface LongPressOptions {
  items: LongPressMenuItem[];
  duration?: number;
}

export interface LongPressResult {
  visible: boolean;
  menuX: number;
  menuY: number;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchMove: () => void;
  };
  closeMenu: () => void;
  menuItems: LongPressMenuItem[];
}

export function useLongPressMenu({ items, duration = 500 }: LongPressOptions): LongPressResult {
  const [visible, setVisible] = useState(false);
  const [menuX, setMenuX] = useState(0);
  const [menuY, setMenuY] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    moved.current = false;
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    timer.current = setTimeout(() => {
      if (!moved.current) {
        const menuWidth = 180;
        const menuHeight = items.length * 44 + 16;
        const adjustedX = Math.min(x, window.innerWidth - menuWidth - 16);
        const adjustedY = Math.min(y, window.innerHeight - menuHeight - 16);

        setMenuX(Math.max(16, adjustedX));
        setMenuY(Math.max(16, adjustedY));
        setVisible(true);
      }
    }, duration);
  }, [duration, items.length]);

  const onTouchEnd = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onTouchMove = useCallback(() => {
    moved.current = true;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleClose = () => setVisible(false);
    const closeTimer = setTimeout(() => {
      document.addEventListener('click', handleClose);
      document.addEventListener('touchstart', handleClose);
    }, 100);

    return () => {
      clearTimeout(closeTimer);
      document.removeEventListener('click', handleClose);
      document.removeEventListener('touchstart', handleClose);
    };
  }, [visible]);

  return {
    visible,
    menuX,
    menuY,
    touchHandlers: { onTouchStart, onTouchEnd, onTouchMove },
    closeMenu,
    menuItems: items,
  };
}
