﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { isTauri, isCapacitor, saveFile, shareFile } from './tauri-files';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** HTML特殊字符转义 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** XML特殊字符转义 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Markdown特殊字符转义 */
export function escapeMd(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|~>]/g, '\\$&');
}

/** 日期格式化为中文：2026-06-14 → 2026年6月14日 */
export function formatDateCN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
}

/** 生成唯一ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 复制文本（支持浏览器 / WebView 降级） */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 某些 WebView / 非安全上下文会失败，继续走降级方案
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const ok = document.execCommand('copy');
    if (!ok) {
      throw new Error('复制失败');
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

/** 下载Blob文件（支持Tauri/Capacitor/浏览器） */
export async function downloadBlob(blob: Blob, filename: string) {
  if (isCapacitor()) {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await shareFile(uint8Array, filename);
    return;
  }

  if (isTauri()) {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const ext = filename.split('.').pop() || '*';
    await saveFile(uint8Array, filename, [
      { name: `${ext.toUpperCase()} 文件`, extensions: [ext] }
    ]);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
