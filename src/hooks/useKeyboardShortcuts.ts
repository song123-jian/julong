﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_PATHS = [
  '/quotation',  // 1
  '/shipping',   // 2
  '/expenses',   // 3
  '/travel',     // 4
  '/',           // 5
  '/parser',     // 6
  '/generator',  // 7
  '/batch',      // 8
  '/special',    // 9
];

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+1~9 切换页面
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          const path = NAV_PATHS[num - 1];
          if (path && location.pathname !== path) {
            navigate(path);
          }
        }
      }

      // Esc 关闭弹窗/抽屉（通过自定义事件通知）
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('app:escape'));
      }

      // Ctrl+K 命令面板（通过自定义事件通知）
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('app:command-palette'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);
}
