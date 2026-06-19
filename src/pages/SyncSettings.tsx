import { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Upload, Download, Trash2, ArrowLeft, Copy, Database, X, History as HistoryIcon, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { isSupabaseConfigured, saveSupabaseConfig, clearSupabaseConfig, SETUP_SQL } from '@/lib/supabase';
import { syncData, onSyncStatusChange, clearCloudData, pushToCloud, pullFromCloud, SyncStatus, SyncResult, getSyncHistory, onSyncHistoryChange, clearSyncHistory, SyncHistoryItem } from '@/lib/sync';
import { refreshAllLocalStorage } from '@/hooks/useLocalStorage';

export default function SyncSettings() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [activeAction, setActiveAction] = useState<'upload' | 'download' | 'sync' | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [sbUrl, setSbUrl] = useState(() => localStorage.getItem('supabase_url') || 'https://asoytlhyiujjxmvvkxca.supabase.co');
  const [sbKey, setSbKey] = useState(() => localStorage.getItem('supabase_anon_key') || 'sb_publishable_lGn2XuKLHSym6huLUpmRtA_wL-HImVs');
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState(false);
  // v6 新增：toast 提示状态
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    details: string[];
    durationMs?: number;
  } | null>(null);
  // v6 新增：同步历史记录
  const [history, setHistory] = useState<SyncHistoryItem[]>(getSyncHistory());
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  useEffect(() => {
    const unsub1 = onSyncStatusChange((status, error, time) => {
      setSyncStatus(status);
      setSyncError(error ?? null);
      if (time) setLastSyncTime(time);
    });
    const unsub2 = onSyncHistoryChange(h => setHistory(h));
    return () => { unsub1(); unsub2(); };
  }, []);

  // 历史展开后，每次 history 变化都滚到顶部
  useEffect(() => {
    if (historyExpanded) {
      // 保留位置即可
    }
  }, [history, historyExpanded]);

  // 显示 toast（自动消失）
  const showToast = useCallback((t: NonNullable<typeof toast>) => {
    setToast(t);
    if (t.durationMs !== 0) {
      setTimeout(() => setToast(null), t.durationMs ?? 6000);
    }
  }, []);

  // 格式化 SyncResult 为可读摘要
  const formatResult = (r: SyncResult): { title: string; details: string[]; type: 'success' | 'error' } => {
    const actionName = { upload: '上传', download: '下载', sync: '同步' }[r.action];
    if (!r.ok) {
      return {
        type: 'error',
        title: `${actionName}失败`,
        details: [
          ...r.details.map(d => `  ${d.table}: ${d.error ?? '未知错误'}`),
          r.errorMessage ? `\n错误信息: ${r.errorMessage}` : '',
        ].filter(Boolean),
      };
    }
    const successDetails = r.details.filter(d => d.status === 'success' || d.status === 'empty');
    const summary = successDetails.map(d => `  ${d.table}: ${d.count} 条`).join('\n');
    // v7：合并冲突摘要（仅同步/下载时可能产生）
    const conflicts = r.conflicts ?? [];
    const localKept = conflicts.filter(c => c.kept === 'local').length;
    const cloudKept = conflicts.filter(c => c.kept === 'cloud').length;
    const bothKept = conflicts.filter(c => c.kept === 'both').length;
    const conflictLines: string[] = [];
    if (localKept > 0) conflictLines.push(`  本地较新胜出: ${localKept} 条`);
    if (cloudKept > 0) conflictLines.push(`  云端较新胜出: ${cloudKept} 条`);
    if (bothKept > 0) conflictLines.push(`  近并发保留双方: ${bothKept} 条（请手动选择保留版本）`);
    const titleSuffix = conflicts.length > 0 ? ` · 冲突 ${conflicts.length} 条` : '';
    return {
      type: 'success',
      title: `${actionName}成功 · 共 ${r.totalCount} 条 · 耗时 ${r.durationMs}ms${titleSuffix}`,
      details: [
        ...(summary ? [summary] : ['  全部为空']),
        ...conflictLines,
      ],
    };
  };

  const handleSaveConfig = useCallback(() => {
    if (sbUrl.trim() && sbKey.trim()) {
      saveSupabaseConfig(sbUrl.trim(), sbKey.trim());
      setConfigured(true);
      showToast({ type: 'success', title: '配置已保存', details: ['正在连接 Supabase...'] });
    }
  }, [sbUrl, sbKey, showToast]);

  const handleDisconnect = useCallback(() => {
    clearSupabaseConfig();
    setConfigured(false);
    setSbUrl('');
    setSbKey('');
    showToast({ type: 'info', title: '已断开云同步', details: [] });
  }, [showToast]);

  const handleSync = useCallback(async () => {
    try {
      setActiveAction('sync');
      const result = await syncData();
      const f = formatResult(result);
      showToast({ type: f.type, title: f.title, details: f.details, durationMs: f.type === 'error' ? 0 : 6000 });
      if (result.ok) {
        // 状态刷新：通知所有 useLocalStorage 实例重新读取，不丢失未保存的表单数据
        refreshAllLocalStorage();
      }
    } catch (err) {
      showToast({ type: 'error', title: '同步异常', details: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setActiveAction(null);
    }
  }, [showToast]);

  const handleUpload = useCallback(async () => {
    try {
      setActiveAction('upload');
      const result = await pushToCloud();
      const f = formatResult(result);
      showToast({ type: f.type, title: f.title, details: f.details, durationMs: f.type === 'error' ? 0 : 6000 });
      if (result.ok) {
        refreshAllLocalStorage();
      }
    } catch (err) {
      showToast({ type: 'error', title: '上传异常', details: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setActiveAction(null);
    }
  }, [showToast]);

  const handleDownload = useCallback(async () => {
    try {
      setActiveAction('download');
      const result = await pullFromCloud();
      const f = formatResult(result);
      showToast({ type: f.type, title: f.title, details: f.details, durationMs: f.type === 'error' ? 0 : 6000 });
      if (result.ok) {
        refreshAllLocalStorage();
      }
    } catch (err) {
      showToast({ type: 'error', title: '下载异常', details: [err instanceof Error ? err.message : String(err)] });
    } finally {
      setActiveAction(null);
    }
  }, [showToast]);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="p-2 text-[#6C757B] hover:text-[#1A1A2E] hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">云同步设置</h1>
          <p className="text-xs text-[#6C757B]">配置 Supabase 实现手机与电脑数据互通</p>
        </div>
      </div>

      {/* 连接状态卡片 */}
      <div className={`rounded-xl p-5 mb-6 border ${configured ? 'bg-[#059669]/5 border-[#059669]/20' : 'bg-gray-50 border-[#E2E8F0]'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${configured ? 'bg-[#059669]/10' : 'bg-gray-100'}`}>
            {configured ? (
              <Cloud size={24} className="text-[#059669]" />
            ) : (
              <CloudOff size={24} className="text-[#6C757B]" />
            )}
          </div>
          <div className="flex-1">
            <h2 className={`font-bold ${configured ? 'text-[#059669]' : 'text-[#6C757B]'}`}>
              {configured ? '云同步已连接' : '未配置云同步'}
            </h2>
            {configured && lastSyncTime && (
              <p className="text-xs text-[#6C757B] mt-0.5">上次同步：{lastSyncTime}</p>
            )}
          </div>
          {syncStatus === 'syncing' && (
            <RefreshCw size={18} className="text-[#D97706] animate-spin" />
          )}
        </div>
      </div>

      {/* 配置区域 */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-6">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h3 className="font-bold text-[#1A1A2E]">Supabase 配置</h3>
        </div>

        <div className="p-5 space-y-4">
          {configured ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#6C757B]">
                  <CheckCircle size={14} className="text-[#059669]" />
                  <span>URL 已配置</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#6C757B]">
                  <CheckCircle size={14} className="text-[#059669]" />
                  <span>Anon Key 已配置</span>
                </div>
              </div>

              {/* 同步操作 */}
              <div className="space-y-2 pt-3 border-t border-[#E2E8F0]">
                <p className="text-xs font-medium text-[#1A1A2E] mb-2">数据同步</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#059669] to-[#0D9488] text-white text-sm font-medium rounded-lg hover:shadow-md disabled:opacity-50"
                  >
                    {activeAction === 'upload' ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    {activeAction === 'upload' ? '上传中...' : '上传覆盖'}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#0284C7] to-[#6366F1] text-white text-sm font-medium rounded-lg hover:shadow-md disabled:opacity-50"
                  >
                    {activeAction === 'download' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                    {activeAction === 'download' ? '下载中...' : '下载覆盖'}
                  </button>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white text-sm font-medium rounded-lg hover:shadow-md disabled:opacity-50"
                >
                  <RefreshCw size={14} className={activeAction === 'sync' ? 'animate-spin' : ''} />
                  {activeAction === 'sync' ? '同步中...' : '双向合并同步'}
                </button>
              </div>

              {syncError && (
                <div className="flex items-center gap-2 p-3 bg-[#DC2626]/5 rounded-lg">
                  <AlertCircle size={14} className="text-[#DC2626]" />
                  <p className="text-xs text-[#DC2626]">{syncError}</p>
                </div>
              )}

              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2 border border-[#DC2626]/30 text-[#DC2626] text-sm font-medium rounded-lg hover:bg-[#DC2626]/5"
              >
                断开连接
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#6C757B] mb-1">Supabase 项目 URL</label>
                  <input
                    type="url"
                    value={sbUrl}
                    onChange={e => setSbUrl(e.target.value)}
                    placeholder="https://xxxxx.supabase.co"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#D97706]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6C757B] mb-1">Anon Key</label>
                  <input
                    type="password"
                    value={sbKey}
                    onChange={e => setSbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#D97706]"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={!sbUrl.trim() || !sbKey.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white text-sm font-medium rounded-lg hover:shadow-md disabled:opacity-50"
              >
                <Cloud size={14} />
                连接云同步
              </button>
            </>
          )}
        </div>
      </div>

      {/* 配置指南 */}
      {!configured && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden mb-6">
          <div className="p-5 border-b border-[#E2E8F0]">
            <h3 className="font-bold text-[#1A1A2E]">配置指南</h3>
          </div>
          <div className="p-5 space-y-4">
            <ol className="text-sm text-[#6C757B] space-y-2 list-decimal list-inside">
              <li>访问 <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#D97706] underline">supabase.com</a> 注册免费账号</li>
              <li>创建新项目，选择离你最近的区域</li>
              <li>在 SQL Editor 中执行建表 SQL</li>
              <li>在 Settings → API 中复制 URL 和 anon key</li>
              <li>填入上方输入框并连接</li>
            </ol>
            <button
              onClick={handleCopySQL}
              className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#6C757B] hover:bg-gray-50 transition-colors"
            >
              {copied ? <CheckCircle size={14} className="text-[#059669]" /> : <Copy size={14} />}
              {copied ? '已复制' : '复制建表 SQL'}
            </button>
          </div>
        </div>
      )}

      {/* 数据管理 */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0]">
          <h3 className="font-bold text-[#1A1A2E]">数据管理</h3>
        </div>
        <div className="p-5">
          {confirmClear ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#DC2626]">
                <AlertCircle size={18} />
                <p className="text-sm font-medium">确定要清除所有本地数据吗？此操作不可恢复！</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const keysToKeep = ['supabase_url', 'supabase_anon_key', 'supabase_disabled'];
                    const allKeys = Object.keys(localStorage);
                    const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
                    keysToRemove.forEach(key => {
                      localStorage.removeItem(key);
                    });
                    await clearCloudData();
                    setConfirmClear(false);
                    refreshAllLocalStorage();
                  }}
                  className="flex-1 px-4 py-2 bg-[#DC2626] text-white text-sm font-medium rounded-lg hover:bg-[#DC2626]/90"
                >
                  确认清除
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#6C757B] text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-2 text-sm text-[#6C757B] hover:text-[#DC2626] transition-colors"
            >
              <Trash2 size={14} />
              <span>清除所有本地数据</span>
            </button>
          )}
        </div>
      </div>

      {/* 底部说明 */}
      <div className="mt-6 text-center">
        <p className="text-xs text-[#6C757B]">
          <Database size={12} className="inline mr-1" />
          云同步配置保存在浏览器本地，不会上传到服务器
        </p>
      </div>

      {/* v6 新增：同步历史日志 */}
      <div className="mt-6 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <button
          onClick={() => setHistoryExpanded(v => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HistoryIcon size={16} className="text-[#6C757B]" />
            <h3 className="font-bold text-[#1A1A2E] text-sm">同步历史（最近 {history.length} / 10 条）</h3>
          </div>
          {historyExpanded ? <ChevronUp size={16} className="text-[#6C757B]" /> : <ChevronDown size={16} className="text-[#6C757B]" />}
        </button>

        {historyExpanded && (
          <div className="border-t border-[#E2E8F0]">
            {history.length === 0 ? (
              <div className="empty-state py-6">
                <Clock size={32} className="empty-state-icon" />
                <p className="empty-state-title">暂无同步记录</p>
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto divide-y divide-[#E2E8F0]">
                  {history.map(item => {
                    const actionName = { upload: '上传', download: '下载', sync: '同步' }[item.action];
                    return (
                      <div key={item.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            item.ok ? 'bg-[#059669]/10' : 'bg-[#DC2626]/10'
                          }`}>
                            {item.ok ? <CheckCircle size={16} className="text-[#059669]" /> : <AlertCircle size={16} className="text-[#DC2626]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-bold ${item.ok ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                                  {actionName}{item.ok ? '成功' : '失败'}
                                </span>
                                <span className="text-xs text-[#6C757B]">·</span>
                                <span className="text-xs text-[#6C757B]">
                                  {item.ok ? `${item.totalCount} 条` : '0 条'}
                                </span>
                                <span className="text-xs text-[#6C757B]">·</span>
                                <span className="text-xs text-[#6C757B]">{item.durationMs}ms</span>
                              </div>
                              <span className="text-xs text-[#6C757B] font-mono">{item.timestampStr}</span>
                            </div>
                            <div className="mt-1.5 space-y-0.5">
                              {item.details.map((d, i) => (
                                <div key={i} className="text-xs text-[#1A1A2E] flex items-start gap-1.5">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                    d.status === 'success' ? 'bg-[#059669]' :
                                    d.status === 'error' ? 'bg-[#DC2626]' :
                                    'bg-[#6C757B]'
                                  }`}></span>
                                  <span className="font-mono break-all">
                                    {d.table}: {d.count > 0 ? `${d.count} 条` : '空'}
                                    {d.error && <span className="text-[#DC2626] ml-1">({d.error})</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {item.errorMessage && (
                              <p className="mt-1 text-xs text-[#DC2626] font-mono break-all">⚠️ {item.errorMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-[#E2E8F0]">
                  {confirmClearHistory ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#DC2626] flex-1">确定要清除所有历史记录吗？</span>
                      <button
                        onClick={() => {
                          clearSyncHistory();
                          setConfirmClearHistory(false);
                          showToast({ type: 'info', title: '历史已清除', details: [] });
                        }}
                        className="px-3 py-1 bg-[#DC2626] text-white text-xs rounded"
                      >
                        确认清除
                      </button>
                      <button
                        onClick={() => setConfirmClearHistory(false)}
                        className="px-3 py-1 border border-[#E2E8F0] text-[#6C757B] text-xs rounded"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClearHistory(true)}
                      className="flex items-center gap-1.5 text-xs text-[#6C757B] hover:text-[#DC2626] transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>清除所有历史</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* v6 新增：Toast 提示（右上角浮动） */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md w-[90vw] md:w-auto md:min-w-[320px] rounded-xl shadow-2xl border-2 animate-[slideIn_0.2s_ease-out] ${
            toast.type === 'success' ? 'bg-[#059669]/10 border-[#059669] backdrop-blur' :
            toast.type === 'error' ? 'bg-[#DC2626]/10 border-[#DC2626] backdrop-blur' :
            'bg-[#0284C7]/10 border-[#0284C7] backdrop-blur'
          }`}
          role="alert"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle size={20} className="text-[#059669]" />}
                {toast.type === 'error' && <AlertCircle size={20} className="text-[#DC2626]" />}
                {toast.type === 'info' && <Cloud size={20} className="text-[#0284C7]" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm ${
                  toast.type === 'success' ? 'text-[#059669]' :
                  toast.type === 'error' ? 'text-[#DC2626]' :
                  'text-[#0284C7]'
                }`}>
                  {toast.title}
                </h4>
                {toast.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {toast.details.map((d, i) => (
                      <p key={i} className="text-xs text-[#1A1A2E] font-mono whitespace-pre-wrap break-all">{d}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                className="flex-shrink-0 p-1 text-[#6C757B] hover:text-[#1A1A2E] hover:bg-white/50 rounded transition-colors"
                aria-label="关闭提示"
              >
                <X size={16} />
              </button>
            </div>
            {toast.type === 'error' && (
              <p className="mt-2 text-xs text-[#6C757B]">点击 × 关闭此提示（可复制错误信息排查）</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
