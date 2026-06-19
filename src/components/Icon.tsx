import { type LucideIcon } from 'lucide-react';
import { Loader2, CheckCircle } from 'lucide-react';

// 统一尺寸标准
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

// 图标状态
export type IconState = 'default' | 'loading' | 'success' | 'error';

interface IconProps {
  icon: LucideIcon;
  size?: IconSize | number;
  className?: string;
  style?: React.CSSProperties;
  state?: IconState;
  'aria-label'?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
}

/**
 * 统一图标组件
 * - 封装 lucide-react，统一 size/color/className
 * - 支持 loading/success/error 状态动画
 * - 自动添加 aria-label
 */
export function Icon({
  icon: IconComponent,
  size = 'md',
  className = '',
  style,
  state = 'default',
  'aria-label': ariaLabel,
  title,
  onClick,
}: IconProps) {
  const sizePx = typeof size === 'number' ? size : SIZE_MAP[size];
  const stateClass = state !== 'default' ? `icon-state-${state}` : '';
  const clickableClass = onClick ? 'icon-clickable' : '';

  // loading 状态替换为旋转 Loader2
  if (state === 'loading') {
    return (
      <span
        className={`inline-flex items-center justify-center icon-state-loading ${clickableClass} ${className}`}
        style={style}
        aria-label={ariaLabel}
        title={title}
        onClick={onClick}
      >
        <Loader2 size={sizePx} className="animate-spin" />
      </span>
    );
  }

  // success 状态替换为 CheckCircle
  if (state === 'success') {
    return (
      <span
        className={`inline-flex items-center justify-center icon-state-success ${clickableClass} ${className}`}
        style={style}
        aria-label={ariaLabel}
        title={title}
        onClick={onClick}
      >
        <CheckCircle size={sizePx} className="text-[#059669]" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${stateClass} ${clickableClass} ${className}`}
      style={style}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
    >
      <IconComponent size={sizePx} />
    </span>
  );
}

// 便捷尺寸转换（供外部使用）
export const iconSize = (size: IconSize | number): number =>
  typeof size === 'number' ? size : SIZE_MAP[size];
