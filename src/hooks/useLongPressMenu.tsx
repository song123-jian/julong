import { useState, useRef, useCallback, useEffect } from 'react';

export interface LongPressMenuItem {
  label: string;
  icon?: string;
  color?: string;
  onClick: () => void;
}

interface LongPressOptions {
  items: LongPressMenuItem[];
  duration?: number; // 长按触发时间（ms）
}

interface LongPressResult {
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

/**
 * 移动端长按操作菜单 Hook
 * 长按列表项后弹出操作菜单（复制/删除/分享等）
 */
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
        // 防止菜单超出屏幕边界
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

  // 点击外部关闭菜单
  useEffect(() => {
    if (!visible) return;
    const handleClose = () => setVisible(false);
    // 延迟绑定，避免触发菜单的同一次点击关闭菜单
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClose);
      document.addEventListener('touchstart', handleClose);
    }, 100);

    return () => {
      clearTimeout(timer);
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

/**
 * 长按操作菜单 UI 组件
 */
export function LongPressMenu({ menu }: { menu: LongPressResult }) {
  if (!menu.visible) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
        onTouchStart={(e) => {
          e.preventDefault();
          menu.closeMenu();
        }}
      />
      {/* 菜单 */}
      <div
        className="fixed z-[9999] bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl border border-[#E2E8F0] dark:border-[#334155] overflow-hidden min-w-[160px] py-1"
        style={{
          left: menu.menuX,
          top: menu.menuY,
          animation: 'pageEnter 0.15s ease-out',
        }}
      >
        {menu.menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              menu.closeMenu();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#334155]/50 transition-colors"
            style={{ color: item.color || undefined }}
          >
            {item.icon && <span className="text-base w-5 text-center">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
