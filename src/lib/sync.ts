import { getSupabase, isSupabaseConfigured } from './supabase';
import { getUpdatedAt, mergeByTimestamp } from './sync-merge';
import type { SyncConflict } from './sync-merge';

const SYNC_MAP = {
  quotation_data: 'quotations',
  quotation_records: 'quotation_records',
  shipping_records: 'shipping_records',
  travel_records: 'travel_records',
  logistics_assignments: 'logistics_assignments',
  logistics_exceptions: 'logistics_exceptions',
  logistics_history: 'logistics_history',
} as const;

const BATCH_SIZE = 50;
const TABLE_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
    console.log(`[Sync] ${tableName} upload progress: ${upsertedCount}/${totalCount}`);
  }

  return { upsertedCount, error: null };
}

export type { SyncConflict } from './sync-merge';

export interface SyncResult {
  ok: boolean;
  action: 'upload' | 'download' | 'sync';
  details: Array<{
    table: string;
    storageKey: string;
    count: number;
    status: 'success' | 'empty' | 'error';
    error?: string;
  }>;
  totalCount: number;
  durationMs: number;
  errorMessage?: string;
  conflicts?: SyncConflict[];
}

export interface SyncHistoryItem {
  id: string;
  timestamp: number;
  timestampStr: string;
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

export function getSyncHistory(): SyncHistoryItem[] {
  try {
    const raw = localStorage.getItem(SYNC_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

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
  } catch (error) {
    console.warn('[Sync] Failed to record history:', error);
  }
}

export function clearSyncHistory(): void {
  try {
    localStorage.removeItem(SYNC_HISTORY_KEY);
    notifyHistoryListeners();
  } catch (error) {
    console.warn('[Sync] Failed to clear history:', error);
  }
}

let historyListeners: Array<(history: SyncHistoryItem[]) => void> = [];

export function onSyncHistoryChange(fn: (history: SyncHistoryItem[]) => void): () => void {
  historyListeners.push(fn);
  return () => {
    historyListeners = historyListeners.filter(listener => listener !== fn);
  };
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
  return () => {
    statusListeners = statusListeners.filter(listener => listener !== fn);
  };
}

export function getSyncStatus() {
  return { status: syncStatus, error: syncError, lastSyncTime };
}

function safeParseItems(raw: string | null): Record<string, unknown>[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item: unknown): item is Record<string, unknown> => {
      return item != null && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string';
    });
  } catch {
    return [];
  }
}

function safeExtractData(data: { data: unknown }[] | null): Record<string, unknown>[] {
  if (!data) return [];

  return data
    .map(row => row.data)
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object');
}

function buildRows(items: Record<string, unknown>[]) {
  return items.map(item => ({
    id: item.id as string,
    data: item,
    updated_at: new Date(getUpdatedAt(item) || Date.now()).toISOString(),
  }));
}

function finalizeSyncResult(
  action: SyncResult['action'],
  details: SyncResult['details'],
  totalCount: number,
  startTime: number,
  conflicts: SyncConflict[]
): SyncResult {
  const failedTables = details.filter(detail => detail.status === 'error');
  const ok = failedTables.length === 0;
  const errorMessage = ok ? undefined : failedTables.map(detail => `${detail.table}: ${detail.error ?? 'unknown error'}`).join('; ');

  syncStatus = ok ? 'success' : 'error';
  syncError = errorMessage ?? null;
  if (ok) {
    lastSyncTime = new Date().toLocaleString('zh-CN');
  }
  notifyListeners();

  const result: SyncResult = {
    ok,
    action,
    details,
    totalCount,
    durationMs: Date.now() - startTime,
    errorMessage,
    conflicts,
  };
  recordSyncHistory(result);
  return result;
}

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

    const result: SyncResult = {
      ok: false,
      action: 'upload',
      details,
      totalCount: 0,
      durationMs: Date.now() - startTime,
      errorMessage,
    };
    recordSyncHistory(result);
    return result;
  }

  const sb = getSupabase()!;
  syncStatus = 'syncing';
  syncError = null;
  notifyListeners();

  for (const [storageKey, tableName] of Object.entries(SYNC_MAP)) {
    try {
      const localItems = safeParseItems(localStorage.getItem(storageKey));

      const { data: cloudRows, error: selectErr } = await withTimeout(
        Promise.resolve(sb.from(tableName).select('id')),
        TABLE_TIMEOUT_MS,
        `${tableName} 查询超时`
      );
      if (selectErr) throw selectErr;

      const localIds = new Set(localItems.map(item => item.id as string));
      const cloudIds = (cloudRows || []).map((row: { id: string }) => row.id);
      const idsToDelete = cloudIds.filter(id => !localIds.has(id));

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await sb.from(tableName).delete().in('id', idsToDelete);
        if (deleteError) {
          console.warn(`[Sync] Failed to delete stale rows from ${tableName}:`, deleteError.message);
        }
      }

      if (localItems.length === 0) {
        details.push({ table: tableName, storageKey, count: 0, status: 'empty' });
        continue;
      }

      const rows = buildRows(localItems);
      const { upsertedCount, error } = await withTimeout(
        batchUpsert(sb, tableName, rows, rows.length),
        TABLE_TIMEOUT_MS,
        `${tableName} upload timeout`
      );
      if (error) throw new Error(error);

      totalCount += upsertedCount;
      details.push({ table: tableName, storageKey, count: upsertedCount, status: 'success' });
    } catch (error) {
      details.push({
        table: tableName,
        storageKey,
        count: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeSyncResult('upload', details, totalCount, startTime, conflicts);
}

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

    const result: SyncResult = {
      ok: false,
      action: 'download',
      details,
      totalCount: 0,
      durationMs: Date.now() - startTime,
      errorMessage,
    };
    recordSyncHistory(result);
    return result;
  }

  const sb = getSupabase()!;
  syncStatus = 'syncing';
  syncError = null;
  notifyListeners();

  for (const [storageKey, tableName] of Object.entries(SYNC_MAP)) {
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(sb.from(tableName).select('data').order('updated_at', { ascending: false })),
        TABLE_TIMEOUT_MS,
        `${tableName} download timeout`
      );
      if (error) throw error;

      const cloudItems = safeExtractData(data);
      const localItems = safeParseItems(localStorage.getItem(storageKey));

      if (cloudItems.length === 0 && localItems.length === 0) {
        localStorage.setItem(storageKey, '[]');
        details.push({ table: tableName, storageKey, count: 0, status: 'empty' });
        continue;
      }

      const { merged, conflicts: tableConflicts } = mergeByTimestamp(localItems, cloudItems, tableName, storageKey);
      conflicts.push(...tableConflicts);

      localStorage.setItem(storageKey, JSON.stringify(merged));
      totalCount += merged.length;
      details.push({ table: tableName, storageKey, count: merged.length, status: 'success' });
    } catch (error) {
      details.push({
        table: tableName,
        storageKey,
        count: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeSyncResult('download', details, totalCount, startTime, conflicts);
}

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

    const result: SyncResult = {
      ok: false,
      action: 'sync',
      details,
      totalCount: 0,
      durationMs: Date.now() - startTime,
      errorMessage,
    };
    recordSyncHistory(result);
    return result;
  }

  const sb = getSupabase()!;
  syncStatus = 'syncing';
  syncError = null;
  notifyListeners();

  for (const [storageKey, tableName] of Object.entries(SYNC_MAP)) {
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(sb.from(tableName).select('data').order('updated_at', { ascending: false })),
        TABLE_TIMEOUT_MS,
        `${tableName} query timeout`
      );
      if (error) throw error;

      const cloudItems = safeExtractData(data);
      const localItems = safeParseItems(localStorage.getItem(storageKey));

      const { merged, conflicts: tableConflicts } = mergeByTimestamp(localItems, cloudItems, tableName, storageKey);
      conflicts.push(...tableConflicts);

      localStorage.setItem(storageKey, JSON.stringify(merged));
      totalCount += merged.length;

      if (merged.length > 0) {
        const rows = buildRows(merged);
        const { error: upsertError } = await withTimeout(
          batchUpsert(sb, tableName, rows, rows.length),
          TABLE_TIMEOUT_MS,
          `${tableName} sync upload timeout`
        );
        if (upsertError) throw new Error(upsertError);
      }

      const mergedIds = new Set(merged.map(item => item.id as string));
      const cloudOnlyIds = cloudItems
        .map(item => item.id as string)
        .filter(id => !mergedIds.has(id));

      if (cloudOnlyIds.length > 0) {
        const { error: deleteError } = await sb.from(tableName).delete().in('id', cloudOnlyIds);
        if (deleteError) {
          console.warn(`[Sync] Failed to delete stale rows from ${tableName}:`, deleteError.message);
        }
      }

      details.push({ table: tableName, storageKey, count: merged.length, status: 'success' });
    } catch (error) {
      details.push({
        table: tableName,
        storageKey,
        count: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return finalizeSyncResult('sync', details, totalCount, startTime, conflicts);
}

export async function clearCloudData(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const sb = getSupabase()!;
  for (const tableName of Object.values(SYNC_MAP)) {
    await sb.from(tableName).delete().gt('id', '');
  }
}
