// 同步合并工具：纯函数，无外部依赖，便于单测
// v7: 基于 updatedAt 时间戳的「最后写入者胜出」策略
// v9: 并发写入冲突优化 — 近并发（5秒内）时保留双方版本供用户选择

/** 并发判定阈值（毫秒）：两端修改时间差 < 5秒视为并发 */
const CONCURRENT_THRESHOLD_MS = 5000;

/** 冲突记录 */
export interface SyncConflict {
  id: string;
  table: string;
  storageKey: string;
  localUpdatedAt: number;
  cloudUpdatedAt: number;
  kept: 'local' | 'cloud' | 'both';
  /** v9 新增：是否为近并发冲突（两端修改时间差 < 5秒） */
  isConcurrent?: boolean;
  /** v9 新增：并发冲突时，本地版本保留的 id 后缀（如 '_local_1700000000000'） */
  localConflictId?: string;
}

/** 读取数据项的时间戳（毫秒），兼容 number / ISO string / 缺失 */
export function getUpdatedAt(item: Record<string, unknown>): number {
  const v = item.updatedAt;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    if (!isNaN(t)) return t;
  }
  return 0;
}

/** 给数据项打上当前时间戳（返回新对象，不修改原对象） */
export function stampUpdatedAt(item: Record<string, unknown>): Record<string, unknown> {
  return { ...item, updatedAt: Date.now() };
}

/**
 * 核心合并函数：按 updatedAt 时间戳去重，保留最新的版本
 * v9 优化：当两端修改时间差 < 5秒（近并发）时，保留双方版本
 *   - 胜出方保留原 id
 *   - 败方保留为 id_local_{timestamp}，供用户手动选择
 *
 * @returns { merged, conflicts }
 *   - merged: 去重后的数组（可能包含并发冲突的双方版本）
 *   - conflicts: 发生冲突的条目（含本地/云端各自时间戳与胜出方）
 */
export function mergeByTimestamp(
  localItems: Record<string, unknown>[],
  cloudItems: Record<string, unknown>[],
  table: string,
  storageKey: string
): { merged: Record<string, unknown>[]; conflicts: SyncConflict[] } {
  const merged = new Map<string, Record<string, unknown>>();
  const conflicts: SyncConflict[] = [];

  // 先放入云端（作为基线）
  cloudItems.forEach(item => {
    merged.set(item.id as string, item);
  });

  // 本地逐条比较
  localItems.forEach(item => {
    const id = item.id as string;
    const localTime = getUpdatedAt(item);
    const existing = merged.get(id);

    if (!existing) {
      // 云端没有，本地独有 → 直接保留
      merged.set(id, item);
      return;
    }

    const cloudTime = getUpdatedAt(existing);
    const timeDiff = Math.abs(localTime - cloudTime);

    if (localTime > cloudTime) {
      // 本地更新 → 本地胜出
      const isConcurrent = timeDiff < CONCURRENT_THRESHOLD_MS;

      if (isConcurrent) {
        // 近并发：保留云端版本为冲突副本，本地版本覆盖原 id
        const conflictId = `${id}_local_${localTime}`;
        merged.set(conflictId, { ...existing, id: conflictId, _conflictOf: id });
        merged.set(id, item);
        conflicts.push({
          id, table, storageKey,
          localUpdatedAt: localTime, cloudUpdatedAt: cloudTime,
          kept: 'both',
          isConcurrent: true,
          localConflictId: conflictId,
        });
      } else {
        conflicts.push({
          id, table, storageKey,
          localUpdatedAt: localTime, cloudUpdatedAt: cloudTime,
          kept: 'local',
        });
        merged.set(id, item);
      }
    } else if (cloudTime > localTime) {
      // 云端更新 → 云端胜出
      const isConcurrent = timeDiff < CONCURRENT_THRESHOLD_MS;

      if (isConcurrent) {
        // 近并发：保留本地版本为冲突副本，云端版本保留原 id
        const conflictId = `${id}_local_${localTime}`;
        merged.set(conflictId, { ...item, id: conflictId, _conflictOf: id });
        conflicts.push({
          id, table, storageKey,
          localUpdatedAt: localTime, cloudUpdatedAt: cloudTime,
          kept: 'both',
          isConcurrent: true,
          localConflictId: conflictId,
        });
      } else {
        conflicts.push({
          id, table, storageKey,
          localUpdatedAt: localTime, cloudUpdatedAt: cloudTime,
          kept: 'cloud',
        });
        // 不覆盖，云端胜出
      }
    }
    // 时间戳相等 → 保留现有，不计入冲突
  });

  return { merged: Array.from(merged.values()), conflicts };
}
