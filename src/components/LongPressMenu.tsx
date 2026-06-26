import type { LongPressResult } from '@/hooks/useLongPressMenu';

export function LongPressMenu({ menu }: { menu: LongPressResult }) {
  if (!menu.visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
        onTouchStart={(e) => {
          e.preventDefault();
          menu.closeMenu();
        }}
      />
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
