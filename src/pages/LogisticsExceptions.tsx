import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, XCircle, Filter, Trash2 } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LogisticsException {
  id: string;
  routeId: string;
  type: string;
  description: string;
  reporter: string;
  status: '待处理' | '处理中' | '已解决';
  date: string;
  updatedAt: number;
}

interface LogisticsRoute {
  id: string;
  providerId: string;
  regions: string[];
}

interface LogisticsProvider {
  id: string;
  name: string;
}

const STATUS_CONFIG = {
  '待处理': { color: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
  '处理中': { color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock },
  '已解决': { color: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
};

const NEXT_STATUS: Record<string, LogisticsException['status']> = {
  '待处理': '处理中',
  '处理中': '已解决',
  '已解决': '待处理',
};

export default function LogisticsExceptions() {
  const [exceptions, setExceptions] = useLocalStorage<LogisticsException[]>('logistics_exceptions', []);
  const [routes] = useLocalStorage<LogisticsRoute[]>('logistics_routes', []);
  const [providers] = useLocalStorage<LogisticsProvider[]>('logistics_providers', []);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const getProviderName = (providerId: string) => providers.find(p => p.id === providerId)?.name ?? '未知';
  const getRouteLabel = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return '未知线路';
    return `${getProviderName(route.providerId)} - ${route.regions.join('、')}`;
  };

  const filtered = exceptions.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterType !== 'all' && e.type !== filterType) return false;
    return true;
  });

  const toggleStatus = (id: string) => {
    setExceptions(exceptions.map(e => {
      if (e.id !== id) return e;
      return { ...e, status: NEXT_STATUS[e.status], updatedAt: Date.now() };
    }));
  };

  const deleteException = (id: string) => {
    if (!window.confirm('确定删除此异常记录？')) return;
    setExceptions(exceptions.filter(e => e.id !== id));
  };

  const statusCounts = {
    total: exceptions.length,
    pending: exceptions.filter(e => e.status === '待处理').length,
    processing: exceptions.filter(e => e.status === '处理中').length,
    resolved: exceptions.filter(e => e.status === '已解决').length,
  };

  const types = [...new Set(exceptions.map(e => e.type))];

  return (
    <div className="space-y-4 xs:space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/logistics" className="p-1.5 text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl xs:text-2xl font-bold text-[#1A1A2E] dark:text-[#E2E8F0] flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={24} />
              异常处理
            </h1>
            <p className="text-[#6C757B] dark:text-[#94A3B8] text-xs mt-1">物流异常记录与处理追踪</p>
          </div>
        </div>
      </div>

      {/* 状态统计 */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '总计', value: statusCounts.total, color: '#6C757B' },
          { label: '待处理', value: statusCounts.pending, color: '#DC2626' },
          { label: '处理中', value: statusCounts.processing, color: '#D97706' },
          { label: '已解决', value: statusCounts.resolved, color: '#059669' },
        ].map(item => (
          <div key={item.label} className="bg-white dark:bg-[#1E293B] rounded-lg p-3 border border-[#E2E8F0] dark:border-[#334155] text-center">
            <div className="text-[10px] text-[#6C757B] dark:text-[#94A3B8]">{item.label}</div>
            <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-[#6C757B]" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#1A1A2E] dark:text-[#E2E8F0]">
          <option value="all">全部状态</option>
          <option value="待处理">待处理</option>
          <option value="处理中">处理中</option>
          <option value="已解决">已解决</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#1A1A2E] dark:text-[#E2E8F0]">
          <option value="all">全部类型</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* 异常列表 */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={48} className="empty-state-icon" />
          <p className="empty-state-title">暂无异常记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => {
            const config = STATUS_CONFIG[e.status];
            const StatusIcon = config.icon;
            return (
              <div key={e.id} className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] p-3 xs:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.color}`}>
                        {e.status}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D97706]/10 text-[#D97706] dark:bg-[#D97706]/20 dark:text-[#F59E0B]">
                        {e.type}
                      </span>
                      <span className="text-[10px] text-[#6C757B] dark:text-[#94A3B8]">{e.date}</span>
                    </div>
                    <p className="text-sm text-[#1A1A2E] dark:text-[#E2E8F0] mb-1">{e.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6C757B] dark:text-[#94A3B8]">
                      <span>线路：{getRouteLabel(e.routeId)}</span>
                      <span>上报人：{e.reporter}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStatus(e.id)}
                      className={`p-1.5 rounded-lg transition-colors active:scale-95 ${config.color}`}
                      title={`切换为${NEXT_STATUS[e.status]}`}
                    >
                      <StatusIcon size={16} />
                    </button>
                    <button onClick={() => deleteException(e.id)} className="p-1.5 text-[#6C757B] hover:text-red-500 transition-colors" title="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
