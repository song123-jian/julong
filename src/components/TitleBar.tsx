import { useEffect, useState } from 'react';
import { Maximize2, Minus, Square, X } from 'lucide-react';

function isTauri(): boolean {
  return '__TAURI__' in window;
}

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isTauri()) return null;

  return <TitleBarInner isMaximized={isMaximized} setIsMaximized={setIsMaximized} />;
}

function TitleBarInner({
  isMaximized,
  setIsMaximized,
}: {
  isMaximized: boolean;
  setIsMaximized: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      if (disposed) return;

      const currentWindow = getCurrentWindow();

      const checkMaximized = async () => {
        try {
          const maximized = await currentWindow.isMaximized();
          if (!disposed) {
            setIsMaximized(maximized);
          }
        } catch {
          // ignore
        }
      };

      await checkMaximized();

      const unlisten = await currentWindow.onResized(() => {
        void checkMaximized();
      });

      cleanup = () => {
        unlisten();
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [setIsMaximized]);

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // ignore
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const currentWindow = getCurrentWindow();
      if (isMaximized) {
        await currentWindow.unmaximize();
      } else {
        await currentWindow.maximize();
      }
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    const saved = localStorage.getItem('close_action');
    if (saved) {
      if (saved === 'exit') {
        void import('@tauri-apps/api/event').then(({ emit }) => {
          emit('force-exit', {});
        });
      } else {
        void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().hide();
        });
      }
      return;
    }

    setCloseDialogOpen(true);
  };

  return (
    <div
      className="hidden md:flex items-center h-9 bg-gradient-to-r from-white to-[#F8F9FA] dark:from-[#1E293B] dark:to-[#0F172A] border-b border-[#E2E8F0] dark:border-[#334155] select-none shrink-0 shadow-sm"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 pl-3 pr-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="relative">
          <div className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#EA580C] rounded-md shadow-sm">
            <span className="text-white font-bold text-xs">聚</span>
          </div>
          <div className="absolute -bottom-0.5 left-0.5 right-0.5 h-[2px] bg-gradient-to-r from-[#D97706] to-[#0D9488] rounded-full opacity-60" />
        </div>
        <span className="text-[#1A1A2E] dark:text-[#E2E8F0] text-xs font-bold tracking-wider">聚隆科技</span>
      </div>

      <div className="flex-1 h-full" data-tauri-drag-region onDoubleClick={handleMaximize} />

      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-11 h-full text-[#6C757B] dark:text-[#94A3B8] hover:bg-[#F1F3F5] dark:hover:bg-[#334155]/50 hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0] transition-colors"
          title="最小化"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-11 h-full text-[#6C757B] dark:text-[#94A3B8] hover:bg-[#F1F3F5] dark:hover:bg-[#334155]/50 hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0] transition-colors"
          title={isMaximized ? '还原' : '最大化'}
        >
          {isMaximized ? <Square size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-11 h-full text-[#6C757B] dark:text-[#94A3B8] hover:bg-gradient-to-r hover:from-[#E81123] hover:to-[#C50F1F] hover:text-white transition-colors"
          title="关闭"
        >
          <X size={16} />
        </button>
      </div>

      {closeDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl w-80 border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#0D9488]" />
            <div className="p-6">
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-[#E2E8F0] mb-2">关闭确认</h3>
              <p className="text-sm text-[#6C757B] dark:text-[#94A3B8] mb-4">您希望如何处理？</p>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="rememberChoice"
                  checked={rememberChoice}
                  onChange={event => setRememberChoice(event.target.checked)}
                  className="w-4 h-4 accent-[#D97706]"
                />
                <label htmlFor="rememberChoice" className="text-xs text-[#6C757B] dark:text-[#94A3B8]">
                  记住我的选择
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (rememberChoice) localStorage.setItem('close_action', 'hide');
                    setCloseDialogOpen(false);
                    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                      getCurrentWindow().hide();
                    });
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-[#D97706]/30 text-[#D97706] dark:text-[#D97706] rounded-lg hover:bg-[#D97706]/5 transition-colors"
                >
                  最小化到托盘
                </button>
                <button
                  onClick={() => {
                    if (rememberChoice) localStorage.setItem('close_action', 'exit');
                    setCloseDialogOpen(false);
                    void import('@tauri-apps/api/event').then(({ emit }) => {
                      emit('force-exit', {});
                    });
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
                >
                  退出应用
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
