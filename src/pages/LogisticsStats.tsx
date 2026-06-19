import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Users, Truck, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface LogisticsProvider { id: string; name: string }
interface LogisticsRoute { id: string; providerId: string; regions: string[] }
interface LogisticsStaff { id: string; name: string; phone: string }
interface LogisticsAssignment { id: string; routeId: string; primaryStaffId: string; backupStaffId: string; isOnLeave: boolean; tasks: string[]; updatedAt: number }
interface LeaveHistory { id: string; assignmentId: string; action: '请假' | '返岗'; staffName: string; timestamp: number; operator: string }
interface LogisticsException { id: string; routeId: string; type: string; description: string; reporter: string; status: '待处理' | '处理中' | '已解决'; date: string; updatedAt: number }

type TimeRange = 'month' | 'quarter' | 'year' | 'all';

function getTimeRangeStart(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter': { const q = Math.floor(now.getMonth() / 3); return new Date(now.getFullYear(), q * 3, 1); }
    case 'year': return new Date(now.getFullYear(), 0, 1);
    case 'all': return new Date(2020, 0, 1);
  }
}

export default function LogisticsStats() {
  const [providers] = useLocalStorage<LogisticsProvider[]>('logistics_providers', []);
  const [routes] = useLocalStorage<LogisticsRoute[]>('logistics_routes', []);
  const [staff] = useLocalStorage<LogisticsStaff[]>('logistics_staff', []);
  const [assignments] = useLocalStorage<LogisticsAssignment[]>('logistics_assignments', []);
  const [leaveHistory] = useLocalStorage<LeaveHistory[]>('logistics_history', []);
  const [exceptions] = useLocalStorage<LogisticsException[]>('logistics_exceptions', []);

  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const rangeStart = getTimeRangeStart(timeRange);

  // 筛选时间范围内的数据
  const filteredHistory = useMemo(() =>
    leaveHistory.filter(h => h.timestamp >= rangeStart.getTime()),
    [leaveHistory, rangeStart]
  );

  const filteredExceptions = useMemo(() =>
    exceptions.filter(e => new Date(e.date) >= rangeStart),
    [exceptions, rangeStart]
  );

  // 各人员负责线路数
  const staffStats = useMemo(() => staff.map(s => {
    const primaryRoutes = assignments.filter(a => a.primaryStaffId === s.id).length;
    const backupRoutes = assignments.filter(a => a.backupStaffId === s.id).length;
    const leaveCount = filteredHistory.filter(h => h.staffName === s.name && h.action === '请假').length;
    const returnCount = filteredHistory.filter(h => h.staffName === s.name && h.action === '返岗').length;
    const exceptionCount = filteredExceptions.filter(e => {
      const route = routes.find(r => r.id === e.routeId);
      if (!route) return false;
      const assignment = assignments.find(a => a.routeId === e.routeId);
      return assignment?.primaryStaffId === s.id;
    }).length;
    return { name: s.name, primaryRoutes, backupRoutes, leaveCount, returnCount, exceptionCount };
  }), [staff, assignments, filteredHistory, filteredExceptions, routes]);

  // 各物流异常数
  const providerStats = useMemo(() => providers.map(p => {
    const providerRoutes = routes.filter(r => r.providerId === p.id);
    const providerRouteIds = providerRoutes.map(r => r.id);
    const exceptionCount = filteredExceptions.filter(e => providerRouteIds.includes(e.routeId)).length;
    const resolvedCount = filteredExceptions.filter(e => providerRouteIds.includes(e.routeId) && e.status === '已解决').length;
    const routeCount = providerRoutes.length;
    return { name: p.name, routeCount, exceptionCount, resolvedCount, resolveRate: exceptionCount > 0 ? Math.round(resolvedCount / exceptionCount * 100) : 100 };
  }), [providers, routes, filteredExceptions]);

  // 异常类型分布
  const exceptionTypeStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredExceptions.forEach(e => { map.set(e.type, (map.get(e.type) || 0) + 1); });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [filteredExceptions]);

  // 总览
  const overview = useMemo(() => ({
    totalExceptions: filteredExceptions.length,
    resolved: filteredExceptions.filter(e => e.status === '已解决').length,
    pending: filteredExceptions.filter(e => e.status === '待处理').length,
    totalLeaves: filteredHistory.filter(h => h.action === '请假').length,
    resolveRate: filteredExceptions.length > 0 ? Math.round(filteredExceptions.filter(e => e.status === '已解决').length / filteredExceptions.length * 100) : 100,
  }), [filteredExceptions, filteredHistory]);

  const timeRangeLabel: Record<TimeRange, string> = { month: '本月', quarter: '本季度', year: '本年度', all: '全部' };

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
              <BarChart3 className="text-blue-500" size={24} />
              统计报表
            </h1>
            <p className="text-[#6C757B] dark:text-[#94A3B8] text-xs mt-1">物流数据统计分析</p>
          </div>
        </div>
        {/* 时间范围选择 */}
        <div className="flex gap-1 bg-gray-100 dark:bg-[#334155] rounded-lg p-0.5">
          {(['month', 'quarter', 'year', 'all'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${timeRange === r ? 'bg-white dark:bg-[#1E293B] text-[#1A1A2E] dark:text-[#E2E8F0] font-semibold shadow-sm' : 'text-[#6C757B] dark:text-[#94A3B8] hover:text-[#1A1A2E] dark:hover:text-[#E2E8F0]'}`}
            >
              {timeRangeLabel[r]}
            </button>
          ))}
        </div>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 xs:grid-cols-5 gap-2 xs:gap-3">
        {[
          { label: '异常总数', value: overview.totalExceptions, color: '#DC2626', icon: AlertTriangle },
          { label: '待处理', value: overview.pending, color: '#D97706', icon: Clock },
          { label: '已解决', value: overview.resolved, color: '#059669', icon: TrendingUp },
          { label: '解决率', value: `${overview.resolveRate}%`, color: '#0D9488', icon: BarChart3 },
          { label: '请假次数', value: overview.totalLeaves, color: '#7C3AED', icon: Calendar },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white dark:bg-[#1E293B] rounded-lg p-3 border border-[#E2E8F0] dark:border-[#334155]">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} style={{ color: item.color }} />
                <span className="text-[10px] text-[#6C757B] dark:text-[#94A3B8]">{item.label}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* 人员统计 */}
      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2">
          <Users size={16} className="text-[#7C3AED]" />
          <span className="font-semibold text-[#1A1A2E] dark:text-[#E2E8F0]">人员统计</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-gray-50 dark:bg-[#0F172A]">
                <th className="text-left px-4 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">姓名</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">主负责</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">代班</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">请假</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">返岗</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">异常处理</th>
              </tr>
            </thead>
            <tbody>
              {staffStats.map(s => (
                <tr key={s.name} className="border-b border-[#E2E8F0] dark:border-[#334155] last:border-b-0">
                  <td className="px-4 py-2 text-[#1A1A2E] dark:text-[#E2E8F0] font-medium">{s.name}</td>
                  <td className="text-center px-3 py-2 text-[#0D9488] font-semibold">{s.primaryRoutes}</td>
                  <td className="text-center px-3 py-2 text-[#0284C7]">{s.backupRoutes}</td>
                  <td className="text-center px-3 py-2 text-[#DC2626]">{s.leaveCount}</td>
                  <td className="text-center px-3 py-2 text-[#059669]">{s.returnCount}</td>
                  <td className="text-center px-3 py-2 text-[#D97706]">{s.exceptionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 物流统计 */}
      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2">
          <Truck size={16} className="text-[#D97706]" />
          <span className="font-semibold text-[#1A1A2E] dark:text-[#E2E8F0]">物流统计</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#334155] bg-gray-50 dark:bg-[#0F172A]">
                <th className="text-left px-4 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">物流</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">线路数</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">异常数</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">已解决</th>
                <th className="text-center px-3 py-2 text-[#6C757B] dark:text-[#94A3B8] font-medium">解决率</th>
              </tr>
            </thead>
            <tbody>
              {providerStats.map(p => (
                <tr key={p.name} className="border-b border-[#E2E8F0] dark:border-[#334155] last:border-b-0">
                  <td className="px-4 py-2 text-[#1A1A2E] dark:text-[#E2E8F0] font-medium">{p.name}</td>
                  <td className="text-center px-3 py-2">{p.routeCount}</td>
                  <td className="text-center px-3 py-2 text-[#DC2626]">{p.exceptionCount}</td>
                  <td className="text-center px-3 py-2 text-[#059669]">{p.resolvedCount}</td>
                  <td className="text-center px-3 py-2">
                    <span className={`font-semibold ${p.resolveRate >= 80 ? 'text-green-600' : p.resolveRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.resolveRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 异常类型分布 */}
      {exceptionTypeStats.length > 0 && (
        <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="font-semibold text-[#1A1A2E] dark:text-[#E2E8F0]">异常类型分布</span>
          </div>
          <div className="p-4 space-y-2">
            {exceptionTypeStats.map(item => {
              const maxCount = exceptionTypeStats[0]?.count || 1;
              const pct = Math.round(item.count / maxCount * 100);
              return (
                <div key={item.type} className="flex items-center gap-3">
                  <span className="text-xs text-[#1A1A2E] dark:text-[#E2E8F0] w-20 shrink-0">{item.type}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-[#334155] rounded-full h-4 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#D97706] to-[#EA580C] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-[#1A1A2E] dark:text-[#E2E8F0] w-8 text-right">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
