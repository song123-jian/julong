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
