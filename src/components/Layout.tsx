import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Sparkles, Layers, Hash, BookOpen, Calculator, CarFront, Package, FileText, Truck, Menu, X, Cloud, CloudOff, Sun, Moon, Monitor, Upload, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { onSyncStatusChange, SyncStatus } from '@/lib/sync';
import { useTheme } from '@/lib/theme';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useToast } from '@/components/toast-context';
import TitleBar from '@/components/TitleBar';
import AboutDialog from '@/components/AboutDialog';

const NAV_ITEMS = [
  { path: '/quotation', label: '报价单', icon: FileText, color: '#7C3AED' },
  { path: '/shipping', label: '发货记录', icon: Package, color: '#059669' },
  { path: '/expenses', label: '费用标准', icon: Calculator, color: '#0284C7' },
  { path: '/travel', label: '出行方式', icon: CarFront, color: '#E11D48' },
  { path: '/logistics', label: '物流分工', icon: Truck, color: '#D97706' },
  { path: '/', label: '规则总览', icon: Home, color: '#D97706' },
  { path: '/parser', label: '牌号解析', icon: Search, color: '#0D9488' },
  { path: '/generator', label: '牌号生成', icon: Sparkles, color: '#DC2626' },
  { path: '/batch', label: '批次号', icon: Hash, color: '#059669' },
  { path: '/special', label: '特殊规则', icon: Layers, color: '#7C3AED' },
  { path: '/reference', label: '参数手册', icon: BookOpen, color: '#EA580C' },
  { path: '/sync', label: '云同步', icon: Cloud, color: '#059669' },
];

const NAV_GROUPS = [
  {
    label: '业务工具',
    items: [
      { path: '/quotation', label: '报价单', icon: FileText, color: '#7C3AED' },
      { path: '/shipping', label: '发货记录', icon: Package, color: '#059669' },
      { path: '/expenses', label: '费用标准', icon: Calculator, color: '#0284C7' },
      { path: '/travel', label: '出行方式', icon: CarFront, color: '#E11D48' },
      { path: '/logistics', label: '物流分工', icon: Truck, color: '#D97706' },
    ],
  },
  {
    label: '系统功能',
    items: [
      { path: '/', label: '规则总览', icon: Home, color: '#D97706' },
      { path: '/parser', label: '牌号解析', icon: Search, color: '#0D9488' },
      { path: '/generator', label: '牌号生成', icon: Sparkles, color: '#DC2626' },
      { path: '/batch', label: '批次号', icon: Hash, color: '#059669' },
      { path: '/special', label: '特殊规则', icon: Layers, color: '#7C3AED' },
      { path: '/reference', label: '参数手册', icon: BookOpen, color: '#EA580C' },
      { path: '/sync', label: '云同步', icon: Cloud, color: '#059669' },
    ],
  },
];

// 手机端显示前5个，平板端显示全部
const MOBILE_TAB_ITEMS = NAV_ITEMS.slice(0, 5);
const TABLET_TAB_ITEMS = NAV_ITEMS;

// 主题切换组件
function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const cycleMode = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    setMode(next[mode]);
  };

  const iconMap = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };
  const labelMap = {
    light: '浅色',
    dark: '深色',
    system: '跟随系统',
  };

  const Icon = iconMap[mode];

  return (
    <button
      onClick={cycleMode}
      className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#6C757B] hover:text-[#D97706] dark:text-[#94A3B8] dark:hover:text-[#D97706] transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-[#334155]/50"
      title={`当前：${labelMap[mode]}，点击切换`}
      aria-label={`切换主题，当前：${labelMap[mode]}`}
    >
      <Icon size={14} />
      <span>{labelMap[mode]}</span>
    </button>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [isDragOver, setIsDragOver] = useState(false);
  const { showToast } = useToast();

  useKeyboardShortcuts();

  // 移动端下拉刷新
  const { pullDistance, isRefreshing, touchHandlers } = usePullToRefresh({
    onRefresh: async () => {
      // 刷新 localStorage 数据
      window.dispatchEvent(new Event('storage'));
      showToast('数据已刷新', 'success');
    },
    enabled: typeof window !== 'undefined' && window.innerWidth < 768,
  });

  useEffect(() => {
    const unsub = onSyncStatusChange((status) => {
      setSyncStatus(status);
      setConfigured(isSupabaseConfigured());
    });
    return unsub;
  }, []);

  // 路由变化时刷新配置状态（用户从SyncSettings返回时）
  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, [location.pathname]);

  // 拖拽文件事件处理
  useEffect(() => {
    if (!('__TAURI__' in window)) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  // 监听 Tauri 的 file-dropped 事件
  useEffect(() => {
    if (!('__TAURI__' in window)) return;

    import('@tauri-apps/api/event').then(({ listen }) => {
      const unlisten = listen<string>('file-dropped', (event) => {
        const filePath = event.payload;
        // 根据文件扩展名跳转到对应页面
        if (filePath.match(/\.(xlsx?|csv)$/i)) {
          navigate('/shipping');
        } else if (filePath.match(/\.(pdf)$/i)) {
          navigate('/parser');
        } else if (filePath.match(/\.(jpe?g|png|bmp|webp)$/i)) {
          navigate('/parser');
        }
      });

      return () => {
        unlisten.then(fn => fn());
      };
    });
  }, [navigate]);

  // Android 返回键拦截
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('backButton', () => {
        // v8 修复：如果关于弹窗打开，先关闭弹窗
        if (aboutOpen) {
          setAboutOpen(false);
          return;
        }
        // 如果有抽屉打开，关闭抽屉
        if (drawerOpen) {
          setDrawerOpen(false);
          return;
        }
        // 如果在首页，弹确认退出
        if (location.pathname === '/') {
          setExitDialogOpen(true);
          return;
        }
        // 否则返回上一页
        navigate(-1);
      });

      return () => {
        listener.then(l => l.remove());
      };
    });
  }, [drawerOpen, aboutOpen, location.pathname, navigate]);

  // 左滑手势：从屏幕左边缘右滑打开抽屉（使用 document 级监听，避免被滚动消费）
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // 只在左边缘20px内开始追踪
      if (touch.clientX < 20) {
        startX = touch.clientX;
        startY = touch.clientY;
        startTime = Date.now();
        tracking = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      // 如果右滑距离超过50px，提前打开抽屉（即时反馈）
      if (deltaX > 100 && Math.abs(touch.clientY - startY) < 80) {
        setDrawerOpen(true);
        tracking = false;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      const elapsed = Date.now() - startTime;

      // 从左边缘右滑超过60px，横向>纵向，时间<600ms
      if (deltaX > 60 && deltaY < 80 && elapsed < 600) {
        setDrawerOpen(true);
      }
      tracking = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#0F172A]">
      {/* 拖拽文件覆盖层 */}
      {isDragOver && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1A2E]/60 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3 p-8 bg-white/90 dark:bg-[#1E293B]/90 rounded-2xl shadow-2xl border-2 border-dashed border-[#D97706] animate-pulse">
            <Upload size={48} className="text-[#D97706] animate-bounce" />
            <p className="text-lg font-bold text-[#1A1A2E] dark:text-[#E2E8F0]">释放文件以打开</p>
            <p className="text-sm text-[#6C757B] dark:text-[#94A3B8]">支持 Excel、PDF、图片等格式</p>
          </div>
        </div>
      )}
      {/* ========== 桌面端自定义标题栏 ========== */}
      <TitleBar />

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* ========== 桌面端侧边栏 ========== */}
        <nav className="hidden md:flex w-60 shrink-0 border-r border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex-col shadow-sm">
          <div className="flex-1 py-4 px-3 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[#6C757B]/50 dark:text-[#94A3B8]/50 text-[10px] font-medium uppercase tracking-widest px-3 mb-2 mt-4 first:mt-0">{group.label}</p>
              {group.items.map(item => {
                const NavIcon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-3 py-2.5 mb-1 text-sm transition-all duration-200 border-l-2 relative rounded-r-lg ${
                      isActive
                        ? 'text-[#1A1A2E] dark:text-[#E2E8F0] bg-gray-50 dark:bg-[#334155]/50'
                        : 'border-transparent text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0] hover:bg-gray-50/50 dark:hover:bg-[#334155]/30'
                    }`}
                    style={isActive ? { borderLeftColor: item.color, backgroundColor: `${item.color}08` } : {}}
                    aria-label={item.label}
                    title={item.label}
                  >
                    {/* hover 竖条预览 */}
                    {!isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full opacity-0 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: item.color }} />
                    )}
                    {/* 选中竖条 */}
                    {isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full opacity-80" style={{ backgroundColor: item.color }} />
                    )}
                    <NavIcon
                      size={20}
                      className={`icon-nav transition-colors ${isActive ? '' : 'group-hover:text-[#1A1A2E] dark:group-hover:text-[#E2E8F0]'}`}
                      style={isActive ? { color: item.color } : {}}
                    />
                    <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                    {isActive && (
                      <div
                        className="ml-auto w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#334155]">
          <Link
            to="/sync"
            className="flex items-center gap-2 mb-2 px-2 text-[10px] text-[#6C757B] dark:text-[#94A3B8] hover:text-[#D97706] dark:hover:text-[#D97706] transition-colors"
            aria-label={configured ? (syncStatus === 'syncing' ? '同步中' : '云同步已连接') : '未配置云同步'}
            title={configured ? (syncStatus === 'syncing' ? '同步中...' : '云同步已连接') : '未配置云同步'}
          >
            {configured ? (
              <>
                <Cloud size={14} className={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
                <span>{syncStatus === 'syncing' ? '同步中...' : '云同步已连接'}</span>
              </>
            ) : (
              <>
                <CloudOff size={14} />
                <span>未配置云同步</span>
              </>
            )}
          </Link>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAboutOpen(true)}
              className="flex items-center gap-2 px-2 group cursor-pointer"
            >
              <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse" />
              <p className="text-[#6C757B] dark:text-[#94A3B8] text-xs group-hover:text-[#D97706] dark:group-hover:text-[#D97706] transition-colors">v1.1.0 · 内部工具</p>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ========== 主内容区 ========== */}
      <main className="flex-1 overflow-auto md:pb-0 pb-28">
        {/* 顶部装饰线 */}
        <div className="h-[3px] bg-gradient-to-r from-[#D97706] via-[#0D9488] to-[#059669] scan-effect" />

        {/* 移动端顶部栏 - 增加状态栏避让 */}
        <div className="md:hidden flex items-center justify-between px-3 xs:px-4 safe-top pb-3 bg-white dark:bg-[#1E293B] shadow-sm">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0] active:opacity-70" aria-label="打开导航菜单" title="导航菜单">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#EA580C] rounded-md hover:rotate-3 transition-transform">
              <span className="text-white font-bold text-sm">聚</span>
            </div>
            <span className="text-sm font-bold text-[#1A1A2E] dark:text-[#E2E8F0]">聚隆科技</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              to="/sync"
              className="p-1.5 text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0]"
              aria-label={configured ? '云同步已连接' : '未配置云同步'}
              title={configured ? '云同步已连接' : '未配置云同步'}
            >
              {configured ? (
                <Cloud size={18} className="text-[#059669]" />
              ) : (
                <CloudOff size={18} />
              )}
            </Link>
          </div>
        </div>

        <div className="page-enter max-w-6xl mx-auto p-3 xs:p-4 tab:p-6 md:p-8" {...touchHandlers}>
          {/* 移动端下拉刷新指示器 */}
          {(pullDistance > 0 || isRefreshing) && (
            <div
              className="flex items-center justify-center py-2 md:hidden"
              style={{ height: `${pullDistance}px`, opacity: pullDistance > 10 ? 1 : 0 }}
            >
              <RefreshCw
                size={20}
                className={`text-[#D97706] ${isRefreshing ? 'animate-spin' : ''}`}
                style={{ transform: `rotate(${pullDistance * 3}deg)` }}
              />
            </div>
          )}
          {children}
        </div>
      </main>
      </div>

      {/* ========== 移动端抽屉遮罩 ========== */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ========== 移动端抽屉侧边栏 ========== */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#1E293B] z-50 shadow-xl transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between bg-gradient-to-b from-[#D97706]/[0.08] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#EA580C] rounded-lg shadow-md">
              <span className="text-white font-bold">聚</span>
            </div>
            <div>
              <h1 className="text-[#1A1A2E] dark:text-[#E2E8F0] text-base font-bold">聚隆科技</h1>
              <p className="text-[#6C757B] dark:text-[#94A3B8] text-[11px]">产品牌号解析系统</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0]" aria-label="关闭导航菜单" title="关闭菜单">
            <X size={20} />
          </button>
        </div>
        <div className="py-3 px-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 60px)' }}>
          {NAV_ITEMS.map(item => {
            const DrawerIcon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 text-sm rounded-lg transition-all active:opacity-70 ${
                  isActive
                    ? 'text-[#1A1A2E] dark:text-[#E2E8F0] font-semibold'
                    : 'text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0] hover:bg-gray-50 dark:hover:bg-[#334155]/30'
                }`}
                style={isActive ? { backgroundColor: `${item.color}10`, color: item.color } : {}}
                aria-label={item.label}
                title={item.label}
              >
                {isActive && (
                  <div className="w-[3px] h-5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                )}
                <DrawerIcon size={20} style={isActive ? { color: item.color } : {}} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-3 pt-3 divider-gradient">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setDrawerOpen(false); setAboutOpen(true); }}
                className="flex items-center gap-2 px-3 group cursor-pointer"
              >
                <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse" />
                <p className="text-[#6C757B] dark:text-[#94A3B8] text-xs group-hover:text-[#D97706] dark:group-hover:text-[#D97706] transition-colors">v1.1.0 · 内部工具</p>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* ========== 退出确认弹窗 ========== */}
      {exitDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 md:hidden" onClick={() => setExitDialogOpen(false)}>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl w-full max-w-xs border border-[#E2E8F0] dark:border-[#334155] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-[3px] bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#0D9488]" />
            <div className="p-5">
              <h3 className="text-base font-bold text-[#1A1A2E] dark:text-[#E2E8F0] mb-2">退出确认</h3>
              <p className="text-sm text-[#6C757B] dark:text-[#94A3B8] mb-4">确定要退出应用吗？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setExitDialogOpen(false)}
                  className="flex-1 px-3 py-2 text-sm border border-[#D97706]/30 text-[#D97706] rounded-lg hover:bg-[#D97706]/5 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setExitDialogOpen(false);
                    import('@capacitor/app').then(({ App }) => App.exitApp());
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
                >
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== 关于弹窗 ========== */}
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* ========== 移动端底部Tab栏 - 上移避开经典导航键 ========== */}
      <nav className="fixed bottom-2 left-0 right-0 safe-bottom bg-white/80 dark:bg-[#1E293B]/80 backdrop-blur-xl border-t border-white/20 dark:border-[#334155]/20 z-30 md:hidden mx-2 rounded-xl shadow-lg">
        <div className="flex items-center justify-around h-13">
          {/* 手机端：显示前5个 */}
          {MOBILE_TAB_ITEMS.map(item => {
            const TabIcon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:opacity-70 tab:hidden ${
                  isActive ? 'text-[#1A1A2E] dark:text-[#E2E8F0]' : 'text-[#6C757B] dark:text-[#94A3B8]'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full" style={{ backgroundColor: item.color }} />
                )}
                <TabIcon
                  size={18}
                  className={`transition-transform duration-200`}
                  style={isActive ? { color: item.color, transform: 'scale(1.05)' } : {}}
                />
                <span className={`text-[10px] whitespace-nowrap leading-none ${isActive ? 'font-bold' : 'font-medium'}`} style={isActive ? { color: item.color } : {}}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          {/* 平板端：显示全部 */}
          {TABLET_TAB_ITEMS.map(item => {
            const TabIcon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={`tab-${item.path}`}
                to={item.path}
                className={`relative hidden tab:flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors active:opacity-70 ${
                  isActive ? 'text-[#1A1A2E] dark:text-[#E2E8F0]' : 'text-[#6C757B] dark:text-[#94A3B8]'
                }`}
                aria-label={item.label}
                title={item.label}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full" style={{ backgroundColor: item.color }} />
                )}
                <TabIcon
                  size={18}
                  className={`transition-transform duration-200`}
                  style={isActive ? { color: item.color, transform: 'scale(1.05)' } : {}}
                />
                <span className={`text-[10px] whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`} style={isActive ? { color: item.color } : {}}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
