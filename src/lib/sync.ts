import { getSupabase, isSupabaseConfigured } from './supabase';
import { getUpdatedAt, stampUpdatedAt, mergeByTimestamp } from './sync-merge';
import type { SyncConflict } from './sync-merge';

// 同步的数据类型和对应的 localStorage key 与 Supabase 表名
// 命名规范：localStorage key 与 Supabase 表名保持一致，便于统一管理
const SYNC_MAP = {
  quotation_data: 'quotations',
  quotation_records: 'quotation_records',  // 报价记录：v6 新增同步（之前遗漏）
  shipping_records: 'shipping_records',
  travel_records: 'travel_records',
  logistics_assignments: 'logistics_assignments',  // 物流分工
  logistics_exceptions: 'logistics_exceptions',     // 物流异常
  logistics_history: 'logistics_history',           // 代班历史
} as const;

// v9 新增：分批上传的批次大小和超时控制
const BATCH_SIZE = 50;           // 每批 upsert 的最大条数
const TABLE_TIMEOUT_MS = 30000;  // 单表操作超时（30秒）

/** 带超时的 Promise 包装 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

/** 分批 upsert：将大数据拆分为 BATCH_SIZE 大小的批次逐批上传 */
async function batchUpsert(
  sb: ReturnType<typeof getSupabase> & {},
  tableName: string,
  rows: Array<{ id: string; data: unknown; updated_at: string }>,
  totalCount: number
): Promise<{ upsertedCount: number; error: string | null }> {
  let upsertedCount = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from(tableName).upsert(batch, { onConflict: 'id' });
    if (error) {
      return { upsertedCount, error: error.message };
    }
    upsertedCount += batch.length;
    console.log(`[Sync] ${tableName} 上传进度: ${upsertedCount}/${totalCount}`);
  }
  return { upsertedCount, error: null };
}

// ========== 冲突解决：基于 updatedAt 时间戳的「最后写入者胜出」策略 ==========
// 详见 ./sync-merge.ts

// 重新导出 SyncConflict，便于消费者从 '@/lib/sync' 导入
export type { SyncConflict } from './sync-merge';

// 同步结果类型（v6 新增：让 UI 能显示详细成功/失败信息）
export interface SyncResult {
  ok: boolean;
  action: 'upload' | 'download' | 'sync';
  details: Array<{
    table: string;
    storageKey: string;
    count: number;     // 同步的条数
    status: 'success' | 'empty' | 'error';
    error?: string;
  }>;
  totalCount: number;
  durationMs: number;
  errorMessage?: string;
  conflicts?: SyncConflict[];  // v7 新增：本次合并中的冲突详情
}

// 历史记录条目（v6 新增：保留最近 10 次同步记录）
export interface SyncHistoryItem {
  id: string;                  // uuid
  timestamp: number;           // 13 位时间戳
  timestampStr: string;        // 本地化时间字符串
  action: 'upload' | 'download' | 'sync';
  ok: boolean;
  totalCount: number;
  durationMs: number;
  details: SyncResult['details'];
  errorMessage?: string;
  conflicts?: SyncConflict[];
}

const SYNC_HISTORY_KEY = 'sync_history';
const MAX_HISTORY = 10;

// 读取历史
export function getSyncHistory(): SyncHistoryItem[] {
  try {
    const raw = localStorage.getItem(SYNC_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

// 写入历史（自动去重 id、追加到头部、保留最近 10 条）
function recordSyncHistory(result: SyncResult): void {
  try {
    const item: SyncHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      timestampStr: new Date().toLocaleString('zh-CN', { hour12: false }),
      action: result.action,
      ok: result.ok,
      totalCount: result.totalCount,
      durationMs: result.durationMs,
      details: result.details,
      errorMessage: result.errorMessage,
      conflicts: result.conflicts,
    };
    const list = getSyncHistory();
    list.unshift(item);
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    notifyHistoryListeners();
  } catch (e) {
    console.warn('[Sync] 记录历史失败:', e);
  }
}

// 清除历史
export function clearSyncHistory(): void {
  try {
    localStorage.removeItem(SYNC_HISTORY_KEY);
    notifyHistoryListeners();
  } catch (e) {
    console.warn('[Sync] 清除历史失败:', e);
  }
}

// 历史变更订阅
let historyListeners: Array<(history: SyncHistoryItem[]) => void> = [];
export function onSyncHistoryChange(fn: (history: SyncHistoryItem[]) => void): () => void {
  historyListeners.push(fn);
  return () => { historyListeners = historyListeners.filter(l => l !== fn); };
}
function notifyHistoryListeners() {
  const history = getSyncHistory();
  historyListeners.forEach(fn => fn(history));
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

let syncStatus: SyncStatus = 'idle';
let syncError: string | null = null;
let lastSyncTime: string | null = null;
let statusListeners: Array<(status: SyncStatus, error?: string | null, time?: string | null) => void> = [];

function notifyListeners() {
  statusListeners.forEach(fn => fn(syncStatus, syncError, lastSyncTime));
}

export function onSyncStatusChange(fn: (status: SyncStatus, error?: string | null, time?: string | null) => void) {
  statusListeners.push(fn);
  return () => { statusListeners = statusListeners.filter(l => l !== fn); };
}

export function getSyncStatus() {
  return { status: syncStatus, error: syncError, lastSyncTime };
}

// 安全解析 localStorage 数据，过滤掉无效条目
function safeParseItems(raw: string | null): Record<string, unknown>[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown): item is Record<string, unknown> =>
      item != null && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string'
    );
  } catch {
    return [];
  }
}

// 安全提取 Supabase 返回的 data 字段，过滤 null
function safeExtractData(data: { data: unknown }[] | null): Record<string, unknown>[] {
  if (!data) return [];
  return data
    .map(row => row.data)
    .filter((d): d is Record<string, unknown> => d != null && typeof d === 'object');
}

// 上传本地数据到 Supabase（按时间戳覆盖，删除云端多余数据）
export async function pushToCloud(): Promise<SyncResult> {
  const startTime = Date.now();
  const details: SyncResult['details'] = [];
  let totalCount = 0;
  const conflicts: SyncConflict[] = [];

  if (!isSupabaseConfigured()) {
    const errorMessage = 'Supabase 未配置';
    syncStatus = 'error';
    syncError = errorMessage;
    notifyListeners();
    const r: SyncResult = {
      ok: false, action: 'upload', details, totalCount: 0,
      durationMs: Date.now() - startTime, errorMessage,
    };
    recordSyncHistory(r);
    return r;
  }
  const sb = getSupabase()!;

  syncStatus = 'syncing';
  syncError = null;
  notifyListeners();

  try {
    for (const [storageKey, tableName] of Object.entries(SYNC_MAP)) {
      try {
        const localItems = safeParseItems(localStorage.getItem(storageKey));

        // v8 修复：先获取云端所有 id，删除本地不存在的云端记录
        const { data: cloudRows, error: selectErr } = await withTimeout(
          Promise.resolve(sb.from(tableName).select('id')),
          TABLE_TIMEOUT_MS,
          `${tableName} 查询超时（${TABLE_TIMEOUT_MS / 1000}秒）`
        );
        if (selectErr) throw selectErr;

        const localIds = new Set(localItems.map(item => item.id as string));
        const cloudIds = (cloudRows || []).map((row: { id: string }) => row.id);
        const idsToDelete = cloudIds.filter((id: string) => !localIds.has(id));

        if (idsToDelete.length > 0) {
          const { error: delErr } = await sb
            .from(tableName)
            .delete()
            .in('id', idsToDelete);
          if (delErr) console.warn(`[Sync] 删除云端 ${tableName} 残留 ${idsToDelete.length} 条失败:`, delErr.message);
          else console.log(`[Sync] 删除云端 ${tableName} 残留 ${idsToDelete.length} 条`);
        }

        if (localItems.length === 0) {
          details.push({ table: tableName, storageKey, count: 0, status: 'empty' });
          continue;
        }

        // 上传前给每条数据盖上当前时间戳
        const stamped = localItems.map(stampUpdatedAt);

        const rows = stamped.map(item => ({
          id: item.id as string,
          data: item,
          updated_at: new Date(item.updatedAt as number).toISOString(),
        }));

        // v9 修复：分批上传 + 超时控制
        const { upsertedCount, error: upsertErr } = await withTimeout(
          batchUpsert(sb, tableName, rows, stamped.length),
          TABLE_TIMEOUT_MS,
          `${tableName} 上传超时（${TABLE_TIMEOUT_MS / 1000}秒）`
        );
        if (upsertErr) throw new Error(upsertErr);
        totalCount += upsertedCount;

        // 把盖戳后的数据回写本地
        localStorage.setItem(storageKey, JSON.stringify(stamped));

        details.push({ table: tableName, storageKey, count: upsertedCount, status: 'success' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        details.push({ table: tableName, storageKey, count: 0, status: 'error', error: msg });
        // v8 修复：不中断后续表的同步，继续处理
      }
    }

    syncStatus = 'success';
    lastSyncTime = new Date().toLocaleString('zh-CN');
    notifyListeners();
    const result: SyncResult = { ok: true, action: 'upload', details, totalCount, durationMs: Date.now() - startTime, conflicts };
    recordSyncHistory(result);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '上传失败';
    syncStatus = 'error';
    syncError = errorMessage;
    notifyListeners();
    const result: SyncResult = { ok: false, action: 'upload', details, totalCount, durationMs: Date.now() - startTime, errorMessage, conflicts };
    recordSyncHistory(result);
    return result;
  }
}

// 从 Supabase 拉取数据到本地（v7 修复：按时间戳合并而非覆盖）
export async function pullFromCloud(): Promise<SyncResult> {
  const startTime = Date.now();
  const details: SyncResult['details'] = [];
  let totalCount = 0;
  const conflicts: SyncConflict[] = [];

  if (!isSupabaseConfigured()) {
    const errorMessage = 'Supabase 未配置';
    syncStatus = 'error';
    syncError = errorMessage;
    notifyListeners();
    const r: SyncResult = {
      ok: false, action: 'download', details, totalCount: 0,
      durationMs: Date.now() - startTime, errorMessage,
    };
    recordSyncHistory(r);
    return r;
  }
  const sb = getSupabase()!;

  syncStatus = 'syncing';
  syncError = null;
  notifyListeners();

  try {
    for (const [storageKey, tableName] of Object.entries(SYNC_MAP)) {
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(sb.from(tableName).select('data').order('updated_at', { ascending: false })),
          TABLE_TIMEOUT_MS,
          `${tableName} 下载超时（${TABLE_TIMEOUT_MS / 1000}秒）`
        );

        if (error) throw error;

        const cloudItems = safeExtractData(data);
        const localItems = safeParseItems(localStorage.getItem(storageKey));

        if (cloudItems.length === 0 && localItems.length === 0) {
          localStorage.setItem(storageKey, '[]');
          details.push({ table: tableName, storageKey, count: 0, status: 'empty' });
          continue;
        }

        // v7 修复：按时间戳合并，避免云端覆盖本地最新修改
        const { merged, conflicts: tblConflicts } = mergeByTimestamp(localItems, cloudItems, tableName, storageKey);
        conflicts.push(...tblConflicts);

        localStorage.setItem(storageKey, JSON.stringify(merged));
        totalCount += merged.length;
        details.push({ table: tableName, storageKey, count: merged.length, status: 'success' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        details.push({ table: tableName, storageKey, count: 0, status: 'error', error: msg });
        // v8 修复：不中断后续表的同步，继续处理
      }
    }

    syncStatus = 'success';
    lastSyncTime = new Date().toLocaleString('zh-CN');
    notifyListeners();
    const result: SyncResult = { ok: true, action: 'download', details, totalCount, durationMs: Date.now() - startTime, conflicts };
    recordSyncHistory(result);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '下载失败';
    syncStatus = 'error';
    syncError = errorMessage;
    notifyListeners();
    const result: SyncResult = { ok: false, action: 'download', details, totalCount, durationMs: Date.now() - startTime, errorMessage, conflicts };
    recordSyncHistory(result);
    return result;
  }
}

// 双向同步：先拉取再推送（v7 修复：全程基于时间戳）
export async function syncData(): Promise<SyncResult> {
  const startTime = Date.now();
  const details: SyncResult['details'] = [];
  let totalCount = 0;
  const conflicts: SyncConflict[] = [];

  if (!isSupabaseConfigured()) {
    const errorMessage = 'Supabase 未配置';
    syncStatus = 'error';
    syncError = errorMessage;
    notifyListeners();
    const r: SyncResult = {
      ok: false, action: 'sync', details, totalCount: 0,
      durationMs: Date.now() - startTime, errorMessage,
    };
    recordSyncHistory(r);
    return r;
  }

  syncStatus = 'syncing';
  syncError = null;
  notifyListeners();

  try {
    const sb = getSupabase()!;
    for (const [storageKey, tableName] of Object.entries(SYNC_MAP)) {
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(sb.from(tableName).select('data').order('updated_at', { ascending: false })),
          TABLE_TIMEOUT_MS,
          `${tableName} 查询超时（${TABLE_TIMEOUT_MS / 1000}秒）`
        );

        if (error) throw error;

        const cloudItems = safeExtractData(data);
        const localItems = safeParseItems(localStorage.getItem(storageKey));

        // v7 修复：按时间戳合并，自动判定胜出方
        const { merged, conflicts: tblConflicts } = mergeByTimestamp(localItems, cloudItems, tableName, storageKey);
        conflicts.push(...tblConflicts);

        localStorage.setItem(storageKey, JSON.stringify(merged));
        totalCount += merged.length;

        // 将合并结果推回云端（v9：分批上传 + 超时控制）
        if (merged.length > 0) {
          const rows = merged.map(item => ({
            id: item.id as string,
            data: item,
            updated_at: new Date(getUpdatedAt(item) || Date.now()).toISOString(),
          }));
          const { error: upErr } = await withTimeout(
            batchUpsert(sb, tableName, rows, merged.length),
            TABLE_TIMEOUT_MS,
            `${tableName} 同步上传超时（${TABLE_TIMEOUT_MS / 1000}秒）`
          );
          if (upErr) throw new Error(upErr);
        }

        // v8 修复：删除云端存在但本地已删除的记录
        const mergedIds = new Set(merged.map(item => item.id as string));
        const cloudOnlyIds = cloudItems
          .map(item => item.id as string)
          .filter(id => !mergedIds.has(id));
        if (cloudOnlyIds.length > 0) {
          const { error: delErr } = await sb.from(tableName).delete().in('id', cloudOnlyIds);
          if (delErr) console.warn(`[Sync] 删除云端 ${tableName} 残留 ${cloudOnlyIds.length} 条失败:`, delErr.message);
        }
        details.push({ table: tableName, storageKey, count: merged.length, status: 'success' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        details.push({ table: tableName, storageKey, count: 0, status: 'error', error: msg });
        // v8 修复：不中断后续表的同步，继续处理
      }
    }

    syncStatus = 'success';
    lastSyncTime = new Date().toLocaleString('zh-CN');
    notifyListeners();
    const result: SyncResult = { ok: true, action: 'sync', details, totalCount, durationMs: Date.now() - startTime, conflicts };
    recordSyncHistory(result);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '同步失败';
    syncStatus = 'error';
    syncError = errorMessage;
    notifyListeners();
    const result: SyncResult = { ok: false, action: 'sync', details, totalCount, durationMs: Date.now() - startTime, errorMessage, conflicts };
    recordSyncHistory(result);
    return result;
  }
}

// 清除云端所有数据
export async function clearCloudData(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getSupabase()!;

  for (const tableName of Object.values(SYNC_MAP)) {
    await sb.from(tableName).delete().gt('id', '');
  }
}
