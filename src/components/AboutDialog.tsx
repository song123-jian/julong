import { useEffect, useState } from 'react';
import { X, Code2, Smartphone, Monitor } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      // 下一帧触发动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
      // 等动画结束再卸载
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-colors duration-250 ${
        animateIn ? 'bg-black/40' : 'bg-black/0'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative bg-white dark:bg-[#1E1E2E] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-250 ${
          animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部装饰渐变条 */}
        <div className="h-1.5 bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#0D9488]" />

        <div className="p-6">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6C757B] hover:text-[#1A1A2E] hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X size={18} />
          </button>

          {/* 品牌 Logo */}
          <div className="flex flex-col items-center mb-5">
            <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#EA580C] rounded-2xl shadow-lg shadow-[#D97706]/20 mb-3">
              <span className="text-white font-bold text-2xl">聚</span>
            </div>
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-gray-100">聚隆科技</h2>
            <p className="text-sm text-[#6C757B] dark:text-gray-400">产品牌号解析系统</p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-[#E2E8F0] dark:border-gray-700 my-4" />

          {/* 信息区域 */}
          <div className="space-y-3">
            {/* 版本号 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757B] dark:text-gray-400">版本</span>
              <span className="text-sm font-medium text-[#1A1A2E] dark:text-gray-200">v1.1.0</span>
            </div>

            {/* 技术栈 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757B] dark:text-gray-400">技术栈</span>
              <div className="flex items-center gap-1.5">
                <Code2 size={13} className="text-[#0D9488]" />
                <span className="text-sm font-medium text-[#1A1A2E] dark:text-gray-200">React</span>
              </div>
            </div>

            {/* 桌面端框架 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757B] dark:text-gray-400">桌面端</span>
              <div className="flex items-center gap-1.5">
                <Monitor size={13} className="text-[#D97706]" />
                <span className="text-sm font-medium text-[#1A1A2E] dark:text-gray-200">Tauri</span>
              </div>
            </div>

            {/* 移动端框架 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6C757B] dark:text-gray-400">移动端</span>
              <div className="flex items-center gap-1.5">
                <Smartphone size={13} className="text-[#7C3AED]" />
                <span className="text-sm font-medium text-[#1A1A2E] dark:text-gray-200">Capacitor</span>
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-[#E2E8F0] dark:border-gray-700 my-4" />

          {/* 版权信息 */}
          <p className="text-center text-xs text-[#6C757B] dark:text-gray-500">
            © 2024 聚隆科技
          </p>
        </div>
      </div>
    </div>
  );
}
