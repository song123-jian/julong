import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './lib/debug'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Tauri Splash 启动屏：主窗口加载完成后通知 Rust 端关闭 splash 窗口
if ('__TAURI__' in window) {
  import('@tauri-apps/api/event').then(({ emit }) => {
    emit('splash-finished', {});
  });
}

// Capacitor 状态栏初始化（仅原生平台）
// v8 修复：根据 localStorage 中保存的主题模式初始化 StatusBar 颜色
if ((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    const savedMode = localStorage.getItem('theme-mode') || 'system';
    const isDark = savedMode === 'dark' || (savedMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#0F172A' });
    } else {
      StatusBar.setStyle({ style: Style.Light });
      StatusBar.setBackgroundColor({ color: '#D97706' });
    }
  }).catch(() => {
    // StatusBar 插件不可用时静默忽略
  });
}
