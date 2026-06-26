import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  Clock,
  Copy,
  Database,
  Download,
  History as HistoryIcon,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  clearSupabaseConfig,
  hasEmbeddedSupabaseConfig,
  isSupabaseConfigured,
  isUsingEmbeddedSupabaseConfig,
  restoreEmbeddedSupabaseConfig,
  saveSupabaseConfig,
  SETUP_SQL,
} from '@/lib/supabase';
import {
  clearSyncHistory,
  getSyncHistory,
  onSyncHistoryChange,
  onSyncStatusChange,
  pullFromCloud,
  pushToCloud,
  syncData,
  type SyncHistoryItem,
  type SyncResult,
  type SyncStatus,
} from '@/lib/sync';
import { refreshAllLocalStorage } from '@/hooks/useLocalStorage';
import { copyText } from '@/lib/utils';

type SyncAction = 'upload' | 'download' | 'sync';
type ToastState = {
  type: 'success' | 'error' | 'info';
  title: string;
  details: string[];
  durationMs?: number;
} | null;

function formatActionLabel(action: SyncAction): string {
  return { upload: '上传', download: '下载', sync: '同步' }[action];
}

function formatResult(result: SyncResult): { title: string; details: string[]; type: 'success' | 'error' } {
  const actionName = formatActionLabel(result.action);

  if (!result.ok) {
    return {
      type: 'error',
      title: `${actionName}失败`,
      details: [
        ...result.details
          .filter(detail => detail.status === 'error')
          .map(detail => `${detail.table}: ${detail.error ?? '未知错误'}`),
        ...(result.errorMessage ? [`错误信息：${result.errorMessage}`] : []),
      ],
    };
  }

  const successDetails = result.details.filter(detail => detail.status === 'success' || detail.status === 'empty');
  const summary = successDetails.length > 0
    ? successDetails.map(detail => `${detail.table}：${detail.count} 条`)
    : ['全部为空'];

  const conflicts = result.conflicts ?? [];
  const localWins = conflicts.filter(item => item.kept === 'local').length;
  const cloudWins = conflicts.filter(item => item.kept === 'cloud').length;
  const keptBoth = conflicts.filter(item => item.kept === 'both').length;

  const conflictSummary = [
    localWins > 0 ? `本地较新：${localWins} 条` : null,
    cloudWins > 0 ? `云端较新：${cloudWins} 条` : null,
    keptBoth > 0 ? `保留双方：${keptBoth} 条` : null,
  ].filter(Boolean) as string[];

  const titleSuffix = conflicts.length > 0 ? ` · 冲突 ${conflicts.length} 条` : '';

  return {
    type: 'success',
    title: `${actionName}成功 · 共 ${result.totalCount} 条 · ${result.durationMs}ms${titleSuffix}`,
    details: [...summary, ...conflictSummary],
  };
}

export default function SyncSettings() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [activeAction, setActiveAction] = useState<SyncAction | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [usingEmbeddedConfig, setUsingEmbeddedConfig] = useState(isUsingEmbeddedSupabaseConfig());
  const [hasEmbeddedConfig] = useState(hasEmbeddedSupabaseConfig());
  const [sbUrl, setSbUrl] = useState(() => localStorage.getItem('supabase_url') || '');
  const [sbKey, setSbKey] = useState(() => localStorage.getItem('supabase_anon_key') || '');
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [history, setHistory] = useState<SyncHistoryItem[]>(getSyncHistory());
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const syncAvailable = configured && syncStatus !== 'syncing';
  const syncModeText = usingEmbeddedConfig ? '内置配置' : configured ? '手动配置' : '未连接';

  const clearToastTimer = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback((nextToast: NonNullable<ToastState>) => {
    clearToastTimer();
    setToast(nextToast);

    if (nextToast.durationMs !== 0) {
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, nextToast.durationMs ?? 5000);
    }
  }, [clearToastTimer]);

  useEffect(() => {
    const unsubscribeStatus = onSyncStatusChange((status, error, time) => {
      setSyncStatus(status);
      setSyncError(error ?? null);
      if (time) setLastSyncTime(time);
      setConfigured(isSupabaseConfigured());
      setUsingEmbeddedConfig(isUsingEmbeddedSupabaseConfig());
    });

    const unsubscribeHistory = onSyncHistoryChange(setHistory);

    return () => {
      unsubscribeStatus();
      unsubscribeHistory();
      clearToastTimer();
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, [clearToastTimer]);

  const runSyncAction = useCallback(async (action: SyncAction, runner: () => Promise<SyncResult>) => {
    try {
      setActiveAction(action);
      const result = await runner();
      const formatted = formatResult(result);
      showToast({
        type: formatted.type,
        title: formatted.title,
        details: formatted.details,
        durationMs: formatted.type === 'error' ? 0 : 5000,
      });

      if (result.ok) {
        refreshAllLocalStorage();
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: `${formatActionLabel(action)}异常`,
        details: [error instanceof Error ? error.message : String(error)],
        durationMs: 0,
      });
    } finally {
      setActiveAction(null);
    }
  }, [showToast]);

  const handleSaveConfig = useCallback(() => {
    if (!sbUrl.trim() || !sbKey.trim()) return;

    saveSupabaseConfig(sbUrl.trim(), sbKey.trim());
    setConfigured(true);
    setUsingEmbeddedConfig(false);
    setShowManualConfig(false);
    showToast({
      type: 'success',
      title: '配置已保存',
      details: ['后续同步将使用当前 Supabase 项目。'],
    });
  }, [sbKey, sbUrl, showToast]);

  const handleDisconnect = useCallback(() => {
    clearSupabaseConfig();
    setConfigured(false);
    setUsingEmbeddedConfig(false);
    setShowManualConfig(hasEmbeddedConfig);
    setSbUrl('');
    setSbKey('');
    showToast({
      type: 'info',
      title: '已断开云同步',
      details: hasEmbeddedConfig ? ['你仍可一键恢复内置配置。'] : [],
    });
  }, [hasEmbeddedConfig, showToast]);

  const handleRestoreDefaultConfig = useCallback(() => {
    restoreEmbeddedSupabaseConfig();
    setConfigured(true);
    setUsingEmbeddedConfig(true);
    setShowManualConfig(false);
    setSbUrl('');
    setSbKey('');
    showToast({
      type: 'success',
      title: '已恢复内置云同步',
      details: ['当前 APK 将直接使用内置 Supabase 配置。'],
    });
  }, [showToast]);

  const handleCopySQL = useCallback(() => {
    void copyText(SETUP_SQL).then(() => {
      setCopied(true);

      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }

      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 2000);
    }).catch((error: unknown) => {
      showToast({
        type: 'error',
        title: '复制失败',
        details: [error instanceof Error ? error.message : '请手动复制 SQL'],
        durationMs: 0,
      });
    });
  }, [showToast]);

  const handleClearLocalData = useCallback(() => {
    const keysToKeep = ['supabase_url', 'supabase_anon_key', 'supabase_disabled'];
    const keysToRemove = Object.keys(localStorage).filter(key => !keysToKeep.includes(key));
    keysToRemove.forEach(key => localStorage.removeItem(key));

    setConfirmClearLocal(false);
    refreshAllLocalStorage();
    showToast({
      type: 'info',
      title: '本地数据已清除',
      details: ['云端数据不会被删除，仍可通过“下载覆盖”恢复。'],
    });
  }, [showToast]);

  const renderActionButton = (
    action: SyncAction,
    label: string,
    busyLabel: string,
    onClick: () => void,
    variant: 'primary' | 'secondary'
  ) => {
    const isBusy = activeAction === action;
    const variantClass = variant === 'primary'
      ? 'bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white hover:shadow-md'
      : 'border border-[#E2E8F0] text-[#1A1A2E] hover:border-[#D97706]/30 hover:bg-[#FFF7ED]';

    return (
      <button
        onClick={onClick}
        disabled={!syncAvailable}
        className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
      >
        {isBusy ? <RefreshCw size={16} className="animate-spin" /> : action === 'upload' ? <Upload size={16} /> : action === 'download' ? <Download size={16} /> : <RefreshCw size={16} />}
        {isBusy ? busyLabel : label}
      </button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="rounded-xl p-2 text-[#6C757B] transition-colors hover:bg-gray-100 hover:text-[#1A1A2E]"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">云同步</h1>
          <p className="text-sm text-[#6C757B]">让这台手机和你的电脑保持同一份数据。</p>
        </div>
      </div>

      <section className={`rounded-2xl border p-5 ${configured ? 'border-[#059669]/20 bg-[#059669]/5' : 'border-[#E2E8F0] bg-white'}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${configured ? 'bg-[#059669]/10 text-[#059669]' : 'bg-gray-100 text-[#6C757B]'}`}>
            {configured ? <Cloud size={24} /> : <CloudOff size={24} />}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[#1A1A2E]">
                {configured ? '已连接云同步' : '尚未连接'}
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${configured ? 'bg-[#059669]/10 text-[#047857]' : 'bg-gray-100 text-[#6C757B]'}`}>
                {syncModeText}
              </span>
            </div>
            <p className="text-sm text-[#6C757B]">
              {configured
                ? usingEmbeddedConfig
                  ? '当前版本已内置配置，安装后即可直接同步。'
                  : '当前使用的是你手动保存的 Supabase 配置。'
                : hasEmbeddedConfig
                  ? '可直接恢复 APK 内置配置并开始同步。'
                  : '先填好 Supabase 项目信息，再启用同步。'}
            </p>
            {lastSyncTime && configured && (
              <p className="text-xs text-[#6C757B]">上次同步：{lastSyncTime}</p>
            )}
            {syncStatus === 'syncing' && (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#D97706]/10 px-3 py-1 text-xs font-medium text-[#B45309]">
                <RefreshCw size={12} className="animate-spin" />
                正在同步
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[#1A1A2E]">一键操作</h3>
          <p className="mt-1 text-sm text-[#6C757B]">平时用双向同步；只有纠偏时才用覆盖。</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {renderActionButton('sync', '双向同步', '同步中...', () => void runSyncAction('sync', syncData), 'primary')}
          {renderActionButton('upload', '上传覆盖', '上传中...', () => void runSyncAction('upload', pushToCloud), 'secondary')}
          {renderActionButton('download', '下载覆盖', '下载中...', () => void runSyncAction('download', pullFromCloud), 'secondary')}
        </div>

        <div className="mt-4 rounded-xl bg-[#F8FAFC] px-4 py-3 text-xs leading-6 text-[#6C757B]">
          上传覆盖：用本地替换云端。
          <br />
          下载覆盖：用云端替换本地。
          <br />
          双向同步：按更新时间自动合并两边数据。
        </div>

        {syncError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#DC2626]/5 px-4 py-3 text-sm text-[#DC2626]">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[#1A1A2E]">连接设置</h3>
          <p className="mt-1 text-sm text-[#6C757B]">默认优先使用 APK 内置配置，手动配置只作为备用。</p>
        </div>

        <div className="space-y-3">
          {configured ? (
            <>
              <div className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-sm text-[#1A1A2E]">
                当前方式：<span className="font-medium">{usingEmbeddedConfig ? 'APK 内置配置' : '手动保存配置'}</span>
              </div>

              <div className="flex flex-wrap gap-3">
                {hasEmbeddedConfig && !usingEmbeddedConfig && (
                  <button
                    onClick={handleRestoreDefaultConfig}
                    className="rounded-xl border border-[#059669]/30 px-4 py-2 text-sm font-medium text-[#059669] transition hover:bg-[#059669]/5"
                  >
                    恢复内置配置
                  </button>
                )}
                <button
                  onClick={handleDisconnect}
                  className="rounded-xl border border-[#DC2626]/30 px-4 py-2 text-sm font-medium text-[#DC2626] transition hover:bg-[#DC2626]/5"
                >
                  断开连接
                </button>
              </div>
            </>
          ) : (
            <>
              {hasEmbeddedConfig && (
                <div className="rounded-xl border border-[#D97706]/20 bg-[#FFF7ED] px-4 py-3 text-sm text-[#9A3412]">
                  当前 APK 已带默认配置，恢复后即可直接使用。
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {hasEmbeddedConfig && (
                  <button
                    onClick={handleRestoreDefaultConfig}
                    className="rounded-xl bg-gradient-to-r from-[#059669] to-[#0D9488] px-4 py-2 text-sm font-medium text-white transition hover:shadow-md"
                  >
                    恢复内置云同步
                  </button>
                )}
                <button
                  onClick={() => setShowManualConfig(v => !v)}
                  className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#1A1A2E] transition hover:bg-gray-50"
                >
                  {showManualConfig || !hasEmbeddedConfig ? '收起手动配置' : '手动填写其他配置'}
                </button>
              </div>
            </>
          )}
        </div>

        {(!configured || showManualConfig) && (!hasEmbeddedConfig || showManualConfig) && (
          <div className="mt-5 space-y-3 border-t border-[#E2E8F0] pt-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6C757B]">Supabase URL</label>
                <input
                  type="url"
                  value={sbUrl}
                  onChange={(event) => setSbUrl(event.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A2E] outline-none transition focus:border-[#D97706]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#6C757B]">Anon Key</label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(event) => setSbKey(event.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A2E] outline-none transition focus:border-[#D97706]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveConfig}
                disabled={!sbUrl.trim() || !sbKey.trim()}
                className="rounded-xl bg-gradient-to-r from-[#D97706] to-[#EA580C] px-4 py-2 text-sm font-medium text-white transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                保存并连接
              </button>

              {!hasEmbeddedConfig && (
                <button
                  onClick={handleCopySQL}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#1A1A2E] transition hover:bg-gray-50"
                >
                  {copied ? <CheckCircle size={14} className="text-[#059669]" /> : <Copy size={14} />}
                  {copied ? '已复制 SQL' : '复制建表 SQL'}
                </button>
              )}
            </div>

            {!hasEmbeddedConfig && (
              <div className="rounded-xl bg-[#F8FAFC] px-4 py-3 text-xs leading-6 text-[#6C757B]">
                1. 在 Supabase 创建项目。
                <br />
                2. 执行下方建表 SQL。
                <br />
                3. 复制项目 URL 和 anon key。
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[#1A1A2E]">本地数据</h3>
          <p className="mt-1 text-sm text-[#6C757B]">这里只清空当前设备，不会动云端数据。</p>
        </div>

        {confirmClearLocal ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-[#DC2626]/5 px-4 py-3 text-sm text-[#DC2626]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>确认清除当前设备上的全部本地数据？此操作不可恢复。</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClearLocalData}
                className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#B91C1C]"
              >
                确认清除
              </button>
              <button
                onClick={() => setConfirmClearLocal(false)}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#1A1A2E] transition hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClearLocal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DC2626]/30 px-4 py-2 text-sm font-medium text-[#DC2626] transition hover:bg-[#DC2626]/5"
          >
            <Trash2 size={14} />
            清除本地数据
          </button>
        )}

        <div className="mt-4 text-xs text-[#6C757B]">
          <Database size={12} className="mr-1 inline" />
          同步配置只保存在当前设备本地。
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <button
          onClick={() => setHistoryExpanded(value => !value)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <HistoryIcon size={16} className="text-[#6C757B]" />
            <div>
              <h3 className="text-sm font-bold text-[#1A1A2E]">同步历史</h3>
              <p className="text-xs text-[#6C757B]">保留最近 {history.length} / 10 条</p>
            </div>
          </div>
          {historyExpanded ? <ChevronUp size={16} className="text-[#6C757B]" /> : <ChevronDown size={16} className="text-[#6C757B]" />}
        </button>

        {historyExpanded && (
          <div className="border-t border-[#E2E8F0]">
            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-sm text-[#6C757B]">
                <Clock size={28} />
                <p>暂无同步记录</p>
              </div>
            ) : (
              <>
                <div className="max-h-96 divide-y divide-[#E2E8F0] overflow-y-auto">
                  {history.map(item => (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.ok ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}>
                          {item.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className={`font-bold ${item.ok ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                              {formatActionLabel(item.action)}{item.ok ? '成功' : '失败'}
                            </span>
                            <span className="text-[#6C757B]">·</span>
                            <span className="text-[#6C757B]">{item.totalCount} 条</span>
                            <span className="text-[#6C757B]">·</span>
                            <span className="text-[#6C757B]">{item.durationMs}ms</span>
                            <span className="text-[#6C757B]">·</span>
                            <span className="font-mono text-xs text-[#6C757B]">{item.timestampStr}</span>
                          </div>

                          <div className="mt-2 space-y-1 text-xs text-[#1A1A2E]">
                            {item.details.map((detail, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <span className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                  detail.status === 'success'
                                    ? 'bg-[#059669]'
                                    : detail.status === 'error'
                                      ? 'bg-[#DC2626]'
                                      : 'bg-[#6C757B]'
                                }`} />
                                <span className="break-all font-mono">
                                  {detail.table}：{detail.count > 0 ? `${detail.count} 条` : '空'}
                                  {detail.error ? `（${detail.error}）` : ''}
                                </span>
                              </div>
                            ))}
                          </div>

                          {item.errorMessage && (
                            <p className="mt-2 break-all text-xs font-mono text-[#DC2626]">{item.errorMessage}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E2E8F0] px-5 py-4">
                  {confirmClearHistory ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-[#DC2626]">确认清空全部同步历史？</span>
                      <button
                        onClick={() => {
                          clearSyncHistory();
                          setConfirmClearHistory(false);
                          showToast({ type: 'info', title: '同步历史已清空', details: [] });
                        }}
                        className="rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => setConfirmClearHistory(false)}
                        className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-[#1A1A2E]"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClearHistory(true)}
                      className="inline-flex items-center gap-2 text-xs font-medium text-[#6C757B] transition hover:text-[#DC2626]"
                    >
                      <Trash2 size={12} />
                      清空同步历史
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 w-[90vw] max-w-md rounded-2xl border-2 shadow-2xl ${
            toast.type === 'success'
              ? 'border-[#059669] bg-[#ECFDF5]'
              : toast.type === 'error'
                ? 'border-[#DC2626] bg-[#FEF2F2]'
                : 'border-[#0284C7] bg-[#EFF6FF]'
          }`}
          role="alert"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {toast.type === 'success' && <CheckCircle size={20} className="text-[#059669]" />}
                {toast.type === 'error' && <AlertCircle size={20} className="text-[#DC2626]" />}
                {toast.type === 'info' && <Cloud size={20} className="text-[#0284C7]" />}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-[#1A1A2E]">{toast.title}</h4>
                {toast.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {toast.details.map((detail, index) => (
                      <p key={index} className="break-all text-xs text-[#374151]">
                        {detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  clearToastTimer();
                  setToast(null);
                }}
                className="shrink-0 rounded-md p-1 text-[#6C757B] transition hover:bg-white/70 hover:text-[#1A1A2E]"
                aria-label="关闭提示"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
