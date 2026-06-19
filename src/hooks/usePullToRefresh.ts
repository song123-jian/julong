import { useState, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // 触发刷新的下拉距离（px）
  enabled?: boolean;   // 是否启用（仅移动端）
}

interface PullToRefreshResult {
  pullDistance: number;
  isRefreshing: boolean;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * 移动端下拉刷新 Hook
 * 仅在页面滚动到顶部时生效
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  enabled = true,
}: PullToRefreshOptions): PullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;
    // 仅在页面滚动到顶部时触发
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [enabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const deltaY = e.touches[0].clientY - startY.current;
    // 仅下拉生效（deltaY > 0）
    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }
    // 阻尼效果：下拉距离越大，阻力越大
    const distance = Math.min(deltaY * 0.5, threshold * 1.5);
    setPullDistance(distance);
  }, [isRefreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
