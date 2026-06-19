import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit3, Check, X, Truck, AlertTriangle, BarChart3, UserCheck, UserX, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { generateId } from '../lib/utils';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ========== 数据类型 ==========
interface LogisticsProvider {
  id: string;
  name: string;
}

interface LogisticsRoute {
  id: string;
  providerId: string;
  regions: string[];
}

interface LogisticsStaff {
  id: string;
  name: string;
  phone: string;
}

interface LogisticsAssignment {
  id: string;
  routeId: string;
  primaryStaffId: string;
  backupStaffId: string;
  isOnLeave: boolean;
  tasks: string[];
  updatedAt: number;
}

interface LeaveHistory {
  id: string;
  assignmentId: string;
  action: '请假' | '返岗';
  staffName: string;
  timestamp: number;
  operator: string;
}

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

// ========== 默认数据 ==========
const DEFAULT_PROVIDERS: LogisticsProvider[] = [
  { id: 'p1', name: '邦快' },
  { id: 'p2', name: '巨邦' },
  { id: 'p3', name: '鹏晨' },
  { id: 'p4', name: '广捷' },
  { id: 'p5', name: '隆远' },
  { id: 'p6', name: '帆宇' },
  { id: 'p7', name: '快递' },
];

const DEFAULT_STAFF: LogisticsStaff[] = [
  { id: 's1', name: '李文花', phone: '' },
  { id: 's2', name: '张立阳', phone: '' },
  { id: 's3', name: '叶正浩', phone: '' },
  { id: 's4', name: '丁国庆', phone: '' },
  { id: 's5', name: '曹玉和', phone: '' },
  { id: 's6', name: '肖逸凡', phone: '' },
];

const DEFAULT_ROUTES: LogisticsRoute[] = [
  { id: 'r1', providerId: 'p1', regions: ['上海', '江苏', '浙江'] },
  { id: 'r2', providerId: 'p2', regions: ['广东', '福建', '海南'] },
  { id: 'r3', providerId: 'p3', regions: ['山东', '河北', '北京', '天津'] },
  { id: 'r4', providerId: 'p4', regions: ['四川', '重庆', '贵州', '云南'] },
  { id: 'r5', providerId: 'p5', regions: ['湖北', '湖南', '河南', '安徽'] },
  { id: 'r6', providerId: 'p6', regions: ['辽宁', '吉林', '黑龙江'] },
  { id: 'r7', providerId: 'p7', regions: ['全国'] },
];

const DEFAULT_ASSIGNMENTS: LogisticsAssignment[] = [
  { id: 'a1', routeId: 'r1', primaryStaffId: 's1', backupStaffId: 's2', isOnLeave: false, tasks: ['包车', '开单', '查货'], updatedAt: Date.now() },
  { id: 'a2', routeId: 'r2', primaryStaffId: 's2', backupStaffId: 's3', isOnLeave: false, tasks: ['包车', '打单', '回单'], updatedAt: Date.now() },
  { id: 'a3', routeId: 'r3', primaryStaffId: 's3', backupStaffId: 's4', isOnLeave: false, tasks: ['自提', '放报告', '查货'], updatedAt: Date.now() },
  { id: 'a4', routeId: 'r4', primaryStaffId: 's4', backupStaffId: 's5', isOnLeave: false, tasks: ['包车', '开单', '送货异常'], updatedAt: Date.now() },
  { id: 'a5', routeId: 'r5', primaryStaffId: 's5', backupStaffId: 's6', isOnLeave: false, tasks: ['包车', '打单', '回单'], updatedAt: Date.now() },
  { id: 'a6', routeId: 'r6', primaryStaffId: 's6', backupStaffId: 's1', isOnLeave: false, tasks: ['自提', '放报告', '查货'], updatedAt: Date.now() },
  { id: 'a7', routeId: 'r7', primaryStaffId: 's1', backupStaffId: 's3', isOnLeave: false, tasks: ['快递', '回单'], updatedAt: Date.now() },
];

const ALL_TASKS = ['包车', '自提', '开单', '打单', '放报告', '查货', '回单', '送货异常'];

// ========== 辅助函数 ==========
function getProviderName(providers: LogisticsProvider[], id: string) {
  return providers.find(p => p.id === id)?.name ?? '未知';
}

function getStaffName(staff: LogisticsStaff[], id: string) {
  return staff.find(s => s.id === id)?.name ?? '未分配';
}

export default function Logistics() {
  const [providers, setProviders] = useLocalStorage<LogisticsProvider[]>('logistics_providers', DEFAULT_PROVIDERS);
  const [routes, setRoutes] = useLocalStorage<LogisticsRoute[]>('logistics_routes', DEFAULT_ROUTES);
  const [staff, setStaff] = useLocalStorage<LogisticsStaff[]>('logistics_staff', DEFAULT_STAFF);
  const [assignments, setAssignments] = useLocalStorage<LogisticsAssignment[]>('logistics_assignments', DEFAULT_ASSIGNMENTS);
  const [leaveHistory, setLeaveHistory] = useLocalStorage<LeaveHistory[]>('logistics_history', []);
  const [exceptions, setExceptions] = useLocalStorage<LogisticsException[]>('logistics_exceptions', []);

  // UI 状态
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set(providers.map(p => p.id)));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LogisticsAssignment>>({});

  // 新增弹窗
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newRouteProviderId, setNewRouteProviderId] = useState('');
  const [newRouteRegions, setNewRouteRegions] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  // 异常弹窗
  const [showException, setShowException] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ routeId: '', type: '送货异常', description: '', reporter: '' });

  // 筛选
  const filteredAssignments = assignments.filter(a => {
    const route = routes.find(r => r.id === a.routeId);
    if (!route) return false;
    if (filterProvider !== 'all' && route.providerId !== filterProvider) return false;
    if (filterStaff !== 'all' && a.primaryStaffId !== filterStaff && a.backupStaffId !== filterStaff) return false;
    return true;
  });

  // 按物流分组
  const groupedByProvider = providers.map(p => ({
    provider: p,
    assignments: filteredAssignments.filter(a => routes.find(r => r.id === a.routeId)?.providerId === p.id),
  })).filter(g => g.assignments.length > 0);

  // 切换展开
  const toggleExpand = (providerId: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  };

  // 代班切换
  const toggleLeave = (assignment: LogisticsAssignment) => {
    const updated = { ...assignment, isOnLeave: !assignment.isOnLeave, updatedAt: Date.now() };
    setAssignments(assignments.map(a => a.id === assignment.id ? updated : a));

    const staffName = getStaffName(staff, assignment.primaryStaffId);
    setLeaveHistory([{
      id: generateId(),
      assignmentId: assignment.id,
      action: updated.isOnLeave ? '请假' : '返岗',
      staffName,
      timestamp: Date.now(),
      operator: '当前用户',
    }, ...leaveHistory]);
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingId) return;
    setAssignments(assignments.map(a => a.id === editingId ? { ...a, ...editForm, updatedAt: Date.now() } as LogisticsAssignment : a));
    setEditingId(null);
    setEditForm({});
  };

  // 删除线路
  const deleteRoute = (routeId: string) => {
    if (!window.confirm('确定删除此线路及分工？')) return;
    setRoutes(routes.filter(r => r.id !== routeId));
    setAssignments(assignments.filter(a => a.routeId !== routeId));
  };

  // 新增物流
  const addProvider = () => {
    if (!newProviderName.trim()) return;
    setProviders([...providers, { id: generateId(), name: newProviderName.trim() }]);
    setNewProviderName('');
    setShowAddProvider(false);
  };

  // 新增线路
  const addRoute = () => {
    if (!newRouteProviderId || !newRouteRegions.trim()) return;
    const newRoute: LogisticsRoute = {
      id: generateId(),
      providerId: newRouteProviderId,
      regions: newRouteRegions.split(/[,，、\s]+/).filter(Boolean),
    };
    setRoutes([...routes, newRoute]);
    const newAssignment: LogisticsAssignment = {
      id: generateId(),
      routeId: newRoute.id,
      primaryStaffId: '',
      backupStaffId: '',
      isOnLeave: false,
      tasks: [],
      updatedAt: Date.now(),
    };
    setAssignments([...assignments, newAssignment]);
    setNewRouteProviderId('');
    setNewRouteRegions('');
    setShowAddRoute(false);
  };

  // 新增员工
  const addStaff = () => {
    if (!newStaffName.trim()) return;
    setStaff([...staff, { id: generateId(), name: newStaffName.trim(), phone: newStaffPhone.trim() }]);
    setNewStaffName('');
    setNewStaffPhone('');
    setShowAddStaff(false);
  };

  // 删除员工
  const deleteStaff = (staffId: string) => {
    const inUse = assignments.some(a => a.primaryStaffId === staffId || a.backupStaffId === staffId);
    if (inUse) { alert('该员工正在负责线路，请先调整分工'); return; }
    if (!window.confirm('确定删除此员工？')) return;
    setStaff(staff.filter(s => s.id !== staffId));
  };

  // 删除物流
  const deleteProvider = (providerId: string) => {
    const routeIds = routes.filter(r => r.providerId === providerId).map(r => r.id);
    if (routeIds.length > 0 && !window.confirm(`该物流下有 ${routeIds.length} 条线路，确定一并删除？`)) return;
    setProviders(providers.filter(p => p.id !== providerId));
    setRoutes(routes.filter(r => r.providerId !== providerId));
    setAssignments(assignments.filter(a => !routeIds.includes(a.routeId)));
  };

  // 添加异常
  const addException = () => {
    if (!exceptionForm.routeId || !exceptionForm.description.trim()) return;
    const newEx: LogisticsException = {
      id: generateId(),
      routeId: exceptionForm.routeId,
      type: exceptionForm.type,
      description: exceptionForm.description.trim(),
      reporter: exceptionForm.reporter.trim() || '未填写',
      status: '待处理',
      date: new Date().toISOString().slice(0, 10),
      updatedAt: Date.now(),
    };
    setExceptions([newEx, ...exceptions]);
    setExceptionForm({ routeId: '', type: '送货异常', description: '', reporter: '' });
    setShowException(false);
  };

  // 统计数据
  const stats = {
    totalProviders: providers.length,
    totalRoutes: routes.length,
    totalStaff: staff.length,
    onLeaveCount: assignments.filter(a => a.isOnLeave).length,
    pendingExceptions: exceptions.filter(e => e.status === '待处理').length,
  };

  return (
    <div className="space-y-4 xs:space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl xs:text-2xl font-bold text-[#1A1A2E] dark:text-[#E2E8F0] flex items-center gap-2">
            <Truck className="text-[#D97706]" size={24} />
            物流分工管理
          </h1>
          <p className="text-[#6C757B] dark:text-[#94A3B8] text-xs mt-1">承运物流 · 线路分工 · 代班管理</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/logistics/exceptions" className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            <AlertTriangle size={14} />
            异常处理{stats.pendingExceptions > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{stats.pendingExceptions}</span>}
          </Link>
          <Link to="/logistics/stats" className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <BarChart3 size={14} />
            统计报表
          </Link>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 xs:grid-cols-5 gap-2 xs:gap-3">
        {[
          { label: '承运物流', value: stats.totalProviders, color: '#D97706' },
          { label: '线路', value: stats.totalRoutes, color: '#0D9488' },
          { label: '人员', value: stats.totalStaff, color: '#7C3AED' },
          { label: '请假中', value: stats.onLeaveCount, color: '#DC2626' },
          { label: '待处理异常', value: stats.pendingExceptions, color: '#E11D48' },
        ].map(item => (
          <div key={item.label} className="bg-white dark:bg-[#1E293B] rounded-lg p-3 border border-[#E2E8F0] dark:border-[#334155]">
            <div className="text-[11px] text-[#6C757B] dark:text-[#94A3B8]">{item.label}</div>
            <div className="text-lg font-bold mt-0.5" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowAddProvider(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#D97706] text-white rounded-lg hover:bg-[#B45309] transition-colors active:scale-95">
          <Plus size={14} /> 新增物流
        </button>
        <button onClick={() => setShowAddRoute(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E] transition-colors active:scale-95">
          <Plus size={14} /> 新增线路
        </button>
        <button onClick={() => setShowAddStaff(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors active:scale-95">
          <Plus size={14} /> 新增员工
        </button>
        <button onClick={() => setShowException(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors active:scale-95">
          <AlertTriangle size={14} /> 上报异常
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#1A1A2E] dark:text-[#E2E8F0]">
          <option value="all">全部物流</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="px-3 py-1.5 text-xs border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#1E293B] text-[#1A1A2E] dark:text-[#E2E8F0]">
          <option value="all">全部人员</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* 分工总览表 */}
      <div className="space-y-3">
        {groupedByProvider.map(({ provider, assignments: providerAssignments }) => {
          const isExpanded = expandedProviders.has(provider.id);
          return (
            <div key={provider.id} className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
              {/* 物流标题行 */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#334155]/30 transition-colors"
                onClick={() => toggleExpand(provider.id)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={16} className="text-[#D97706]" /> : <ChevronRight size={16} className="text-[#6C757B]" />}
                  <Truck size={16} className="text-[#D97706]" />
                  <span className="font-semibold text-[#1A1A2E] dark:text-[#E2E8F0]">{provider.name}</span>
                  <span className="text-[11px] text-[#6C757B] dark:text-[#94A3B8]">{providerAssignments.length} 条线路</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteProvider(provider.id); }}
                  className="p-1 text-[#6C757B] hover:text-red-500 transition-colors"
                  title="删除物流"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* 线路列表 */}
              {isExpanded && (
                <div className="border-t border-[#E2E8F0] dark:border-[#334155]">
                  {providerAssignments.map(assignment => {
                    const route = routes.find(r => r.id === assignment.routeId);
                    if (!route) return null;
                    const isEditing = editingId === assignment.id;

                    return (
                      <div key={assignment.id} className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] last:border-b-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          {/* 线路信息 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="text-sm font-medium text-[#1A1A2E] dark:text-[#E2E8F0]">{route.regions.join('、')}</span>
                              <button onClick={() => deleteRoute(route.id)} className="p-0.5 text-[#6C757B] hover:text-red-500 transition-colors" title="删除线路">
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {/* 任务标签 */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {assignment.tasks.map(task => (
                                <span key={task} className="px-1.5 py-0.5 text-[10px] bg-[#D97706]/10 text-[#D97706] dark:bg-[#D97706]/20 dark:text-[#F59E0B] rounded">
                                  {task}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 人员信息 */}
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <select value={editForm.primaryStaffId ?? ''} onChange={e => setEditForm({ ...editForm, primaryStaffId: e.target.value })} className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#334155] rounded bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0]">
                                  <option value="">选择负责人</option>
                                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select value={editForm.backupStaffId ?? ''} onChange={e => setEditForm({ ...editForm, backupStaffId: e.target.value })} className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#334155] rounded bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0]">
                                  <option value="">选择代班人</option>
                                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button onClick={saveEdit} className="p-1 text-green-600 hover:text-green-700"><Check size={16} /></button>
                                <button onClick={() => { setEditingId(null); setEditForm({}); }} className="p-1 text-[#6C757B] hover:text-red-500"><X size={16} /></button>
                              </>
                            ) : (
                              <>
                                {/* 负责人 */}
                                <button
                                  onClick={() => toggleLeave(assignment)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                                    assignment.isOnLeave
                                      ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                      : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                  }`}
                                  title={assignment.isOnLeave ? '点击返岗' : '点击请假'}
                                >
                                  {assignment.isOnLeave ? <UserX size={12} /> : <UserCheck size={12} />}
                                  {getStaffName(staff, assignment.primaryStaffId)}
                                  {assignment.isOnLeave && '(请假)'}
                                </button>
                                {/* 代班人 */}
                                {assignment.isOnLeave && assignment.backupStaffId && (
                                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                    <UserCheck size={12} />
                                    {getStaffName(staff, assignment.backupStaffId)}(代班)
                                  </span>
                                )}
                                {/* 编辑按钮 */}
                                <button
                                  onClick={() => { setEditingId(assignment.id); setEditForm({ primaryStaffId: assignment.primaryStaffId, backupStaffId: assignment.backupStaffId }); }}
                                  className="p-1 text-[#6C757B] hover:text-[#D97706] transition-colors"
                                  title="编辑分工"
                                >
                                  <Edit3 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 员工列表 */}
      <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2">
          <UserCheck size={16} className="text-[#7C3AED]" />
          <span className="font-semibold text-[#1A1A2E] dark:text-[#E2E8F0]">员工管理</span>
        </div>
        <div className="divide-y divide-[#E2E8F0] dark:divide-[#334155]">
          {staff.map(s => {
            const routeCount = assignments.filter(a => a.primaryStaffId === s.id || a.backupStaffId === s.id).length;
            return (
              <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <span className="text-sm text-[#1A1A2E] dark:text-[#E2E8F0]">{s.name}</span>
                  {s.phone && <span className="text-[11px] text-[#6C757B] dark:text-[#94A3B8] ml-2">{s.phone}</span>}
                  <span className="text-[10px] text-[#6C757B] dark:text-[#94A3B8] ml-2">负责 {routeCount} 条线路</span>
                </div>
                <button onClick={() => deleteStaff(s.id)} className="p-1 text-[#6C757B] hover:text-red-500 transition-colors" title="删除员工">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 请假历史 */}
      {leaveHistory.length > 0 && (
        <div className="bg-white dark:bg-[#1E293B] rounded-lg border border-[#E2E8F0] dark:border-[#334155] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2">
            <Clock size={16} className="text-[#0284C7]" />
            <span className="font-semibold text-[#1A1A2E] dark:text-[#E2E8F0]">代班历史</span>
          </div>
          <div className="divide-y divide-[#E2E8F0] dark:divide-[#334155] max-h-60 overflow-y-auto">
            {leaveHistory.slice(0, 20).map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${h.action === '请假' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                    {h.action}
                  </span>
                  <span className="text-xs text-[#1A1A2E] dark:text-[#E2E8F0]">{h.staffName}</span>
                </div>
                <span className="text-[10px] text-[#6C757B] dark:text-[#94A3B8]">{new Date(h.timestamp).toLocaleString('zh-CN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 弹窗：新增物流 ===== */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddProvider(false)}>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">新增承运物流</h3>
            <input value={newProviderName} onChange={e => setNewProviderName(e.target.value)} placeholder="物流名称" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3" autoFocus onKeyDown={e => e.key === 'Enter' && addProvider()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddProvider(false)} className="px-4 py-1.5 text-xs text-[#6C757B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-gray-50 dark:hover:bg-[#334155]/30">取消</button>
              <button onClick={addProvider} className="px-4 py-1.5 text-xs bg-[#D97706] text-white rounded-lg hover:bg-[#B45309]">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 弹窗：新增线路 ===== */}
      {showAddRoute && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRoute(false)}>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">新增线路</h3>
            <select value={newRouteProviderId} onChange={e => setNewRouteProviderId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">
              <option value="">选择承运物流</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={newRouteRegions} onChange={e => setNewRouteRegions(e.target.value)} placeholder="覆盖省市（逗号分隔，如：上海、江苏）" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3" onKeyDown={e => e.key === 'Enter' && addRoute()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddRoute(false)} className="px-4 py-1.5 text-xs text-[#6C757B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-gray-50 dark:hover:bg-[#334155]/30">取消</button>
              <button onClick={addRoute} className="px-4 py-1.5 text-xs bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E]">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 弹窗：新增员工 ===== */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddStaff(false)}>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">新增员工</h3>
            <input value={newStaffName} onChange={e => setNewStaffName(e.target.value)} placeholder="姓名" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3" autoFocus />
            <input value={newStaffPhone} onChange={e => setNewStaffPhone(e.target.value)} placeholder="手机号（选填）" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3" onKeyDown={e => e.key === 'Enter' && addStaff()} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddStaff(false)} className="px-4 py-1.5 text-xs text-[#6C757B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-gray-50 dark:hover:bg-[#334155]/30">取消</button>
              <button onClick={addStaff} className="px-4 py-1.5 text-xs bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9]">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 弹窗：上报异常 ===== */}
      {showException && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowException(false)}>
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">上报异常</h3>
            <select value={exceptionForm.routeId} onChange={e => setExceptionForm({ ...exceptionForm, routeId: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">
              <option value="">选择线路</option>
              {routes.map(r => <option key={r.id} value={r.id}>{getProviderName(providers, r.providerId)} - {r.regions.join('、')}</option>)}
            </select>
            <select value={exceptionForm.type} onChange={e => setExceptionForm({ ...exceptionForm, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3">
              {ALL_TASKS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea value={exceptionForm.description} onChange={e => setExceptionForm({ ...exceptionForm, description: e.target.value })} placeholder="异常描述" rows={3} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3 resize-none" />
            <input value={exceptionForm.reporter} onChange={e => setExceptionForm({ ...exceptionForm, reporter: e.target.value })} placeholder="上报人" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#E2E8F0] mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowException(false)} className="px-4 py-1.5 text-xs text-[#6C757B] border border-[#E2E8F0] dark:border-[#334155] rounded-lg hover:bg-gray-50 dark:hover:bg-[#334155]/30">取消</button>
              <button onClick={addException} className="px-4 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">提交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
