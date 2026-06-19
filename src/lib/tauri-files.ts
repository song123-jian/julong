import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

// 检测是否在 Tauri 环境中
export function isTauri(): boolean {
  return '__TAURI__' in window;
}

// 检测是否在 Capacitor 原生环境中（排除 Web 平台）
export function isCapacitor(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

// 保存文件（弹出另存为对话框）
export async function saveFile(
  data: Uint8Array | string,
  defaultName: string,
  filters?: { name: string; extensions: string[] }[]
): Promise<boolean> {
  if (isCapacitor()) {
    // Capacitor 环境：先保存到临时目录，然后分享
    const writeData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const base64 = uint8ArrayToBase64(writeData);
    const result = await Filesystem.writeFile({
      path: defaultName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: defaultName,
      url: result.uri,
    });
    return true;
  }

  if (!isTauri()) {
    // Web 环境降级：使用浏览器下载
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  const filePath = await save({
    defaultPath: defaultName,
    filters: filters || [{ name: '所有文件', extensions: ['*'] }]
  });

  if (!filePath) return false; // 用户取消

  // 如果 data 是字符串，转换为 Uint8Array
  const writeData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  await writeFile(filePath, writeData);
  return true;
}

// 打开文件选择对话框
export async function openFile(
  filters?: { name: string; extensions: string[] }[]
): Promise<string | null> {
  if (isCapacitor()) {
    // Capacitor 环境：使用文件选择器
    try {
      const result = await FilePicker.pickFiles({
        limit: 1,
      });
      if (result.files.length > 0 && result.files[0].path) {
        return result.files[0].path;
      }
      return null;
    } catch {
      // 用户取消选择
      return null;
    }
  }

  if (!isTauri()) {
    // Web 环境降级：使用 input[type=file]
    return null;
  }

  const result = await open({
    multiple: false,
    filters: filters || [{ name: '所有文件', extensions: ['*'] }]
  });

  return result as string | null;
}

// 分享文件（Capacitor 环境专用）
export async function shareFile(data: Uint8Array, fileName: string): Promise<void> {
  if (!isCapacitor()) return;

  const base64 = uint8ArrayToBase64(data);
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title: fileName,
    url: result.uri,
  });
}

// Uint8Array 转 Base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
