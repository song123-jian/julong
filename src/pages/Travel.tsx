﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState } from 'react';
import { Plane, Train, Car, CarFront, Plus, Trash2, Save, RotateCcw, MapPin, Calendar, ArrowRight, TrendingUp, Receipt, Compass, Sparkles, Wallet } from 'lucide-react';
import { recognizeTravelContent, type RecognizedTravelItem } from '../utils/contentRecognizer';
import { useRecognizer } from '../hooks/useRecognizer';
import { generateId } from '../lib/utils';
import { RecognizerPanel } from '../components/RecognizerPanel';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { isTier1City, getHotelMax, checkOverspend, calcDriveFuelCost, TAXI_MAX, DRIVE_FUEL_RATE } from '../config/expenseRules';

type TravelType = '高铁' | '飞机' | '打车' | '开车' | '住宿';

interface TravelRecord {
  id: string;
  date: string;
  type: TravelType;
  from: string;
  to: string;
  amount: number;
  km?: number;
  city?: string;
  isTier1?: boolean;
  approved?: boolean; // 超标审批标记
}


const TYPE_CONFIG: Record<TravelType, { icon: typeof Train; color: string; bg: string; label: string }> = {
  '高铁': { icon: Train, color: '#0D9488', bg: 'rgba(13,148,136,0.08)', label: '高铁' },
  '飞机': { icon: Plane, color: '#EA580C', bg: 'rgba(234,88,12,0.08)', label: '飞机' },
  '打车': { icon: Car, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: '打车' },
  '开车': { icon: CarFront, color: '#0284C7', bg: 'rgba(2,132,199,0.08)', label: '开车' },
  '住宿': { icon: MapPin, color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: '住宿' },
};

const TABS: TravelType[] = ['高铁', '飞机', '打车', '开车', '住宿'];

const STORAGE_KEY = 'travel_records';

const MOCK_TRAVEL_RECORDS: TravelRecord[] = [];

export default function Travel() {
  const [records, setRecords] = useLocalStorage<TravelRecord[]>(STORAGE_KEY, () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return MOCK_TRAVEL_RECORDS;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return MOCK_TRAVEL_RECORDS;
      const valid = parsed.filter((r): r is TravelRecord =>
        r != null && typeof r === 'object' &&
        typeof r.date === 'string' && typeof r.type === 'string' && typeof r.amount === 'number' && typeof r.from === 'string' && typeof r.to === 'string'
      );
      return valid;
    } catch {
      return MOCK_TRAVEL_RECORDS;
    }
  });
  const [activeTab, setActiveTab] = useState<TravelType>('高铁');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [km, setKm] = useState('');
  const [city, setCity] = useState('');
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // 智能识别
  const recognizer = useRecognizer<RecognizedTravelItem>();

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setFrom('');
    setTo('');
    setAmount('');
    setKm('');
    setCity('');
    setEditId(null);
    recognizer.reset();
  };

  const isTaxi = activeTab === '打车';
  const isDrive = activeTab === '开车';
  const isHotel = activeTab === '住宿';

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!date || !amt || amt <= 0) return;
    if (!isTaxi && !isDrive && !isHotel && (!from.trim() || !to.trim())) return;
    if (isDrive && (!from.trim() || !to.trim())) return;
    if (isHotel && !city.trim()) return;
    const finalAmount = isTaxi ? Math.min(parseFloat(amount), TAXI_MAX)
      : isHotel ? Math.min(parseFloat(amount), getHotelMax(city.trim()))
      : parseFloat(amount);
    const tier1 = isHotel ? isTier1City(city.trim()) : undefined;
    if (editId) {
      setRecords(prev => prev.map(r => r.id === editId ? {
        ...r,
        date,
        type: activeTab,
        from: isTaxi || isHotel ? '' : from.trim(),
        to: isTaxi || isHotel ? '' : to.trim(),
        amount: finalAmount,
        km: isDrive && km ? parseFloat(km) : r.km,
        city: isHotel ? city.trim() : r.city,
        isTier1: tier1,
      } : r));
      setEditId(null);
    } else {
      const newRecord: TravelRecord = {
        id: generateId(),
        date,
        type: activeTab,
        from: isTaxi || isHotel ? '' : from.trim(),
        to: isTaxi || isHotel ? '' : to.trim(),
        amount: finalAmount,
        ...(isDrive && km ? { km: parseFloat(km) } : {}),
        ...(isHotel ? { city: city.trim(), isTier1: tier1 } : {}),
        ...(isTaxi && city.trim() ? { city: city.trim() } : {}),
      };
      setRecords(prev => [...prev, newRecord]);
    }
    resetForm();
  };

  const handleEdit = (record: TravelRecord) => {
    setEditId(record.id);
    setDate(record.date);
    setActiveTab(record.type);
    setFrom(record.from);
    setTo(record.to);
    setAmount(record.amount.toString());
    setKm(record.km?.toString() || '');
    setCity(record.city || '');
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    if (editId === id) resetForm();
  };

  const handleClear = () => {
    if (records.length === 0) return;
    setRecords([]);
    resetForm();
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 智能识别处理 - 使用 useRecognizer hook

  const handleApplyTravelRecognized = (items: RecognizedTravelItem[]) => {
    if (items.length === 0) return;
    const first = items[0];
    if (first.date) setDate(first.date);
    if (first.type) setActiveTab(first.type as TravelType);
    if (first.from) setFrom(first.from);
    if (first.to) setTo(first.to);
    if (first.amount > 0) setAmount(first.amount.toString());
    if (first.km > 0) setKm(first.km.toString());
  };

  // 统计
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const trainCount = records.filter(r => r.type === '高铁').length;
  const planeCount = records.filter(r => r.type === '飞机').length;
  const taxiCount = records.filter(r => r.type === '打车').length;
  const driveCount = records.filter(r => r.type === '开车').length;
  const trainTotal = records.filter(r => r.type === '高铁').reduce((sum, r) => sum + r.amount, 0);
  const planeTotal = records.filter(r => r.type === '飞机').reduce((sum, r) => sum + r.amount, 0);
  const taxiTotal = records.filter(r => r.type === '打车').reduce((sum, r) => sum + r.amount, 0);
  const driveTotal = records.filter(r => r.type === '开车').reduce((sum, r) => sum + r.amount, 0);
  const hotelCount = records.filter(r => r.type === '住宿').length;
  const hotelTotal = records.filter(r => r.type === '住宿').reduce((sum, r) => sum + r.amount, 0);

  // 当前tab的记录
  const currentRecords = records.filter(r => r.type === activeTab).sort((a, b) => b.date.localeCompare(a.date));
  const currentTotal = currentRecords.reduce((sum, r) => sum + r.amount, 0);

  const activeConfig = TYPE_CONFIG[activeTab];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#E11D48] rounded-lg shadow-md">
          <Compass size={16} className="text-white md:hidden" />
          <Compass size={20} className="text-white hidden md:block" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg md:text-2xl font-bold gradient-text">出行方式 · 住宿</h2>
          <p className="text-[11px] md:text-xs text-[#6C757B] mt-0.5">记录高铁、飞机、打车、开车出行信息，管理出行花费及住宿费用</p>
        </div>
        <button
          onClick={() => window.location.hash = '/expenses'}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#0284C7]/40 text-[#0284C7] hover:bg-[#0284C7]/5 rounded-lg transition-colors"
        >
          <Wallet size={12} /> 费用标准
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-2 md:gap-3">
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#D97706]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={14} className="text-[#D97706]" />
              <span className="text-xs text-[#6C757B]">总记录</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#D97706]">{records.length}<span className="text-xs text-[#6C757B] ml-1">条</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#D97706]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[#D97706]" />
              <span className="text-xs text-[#6C757B]">总花费</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#D97706]">¥{totalAmount.toFixed(0)}<span className="text-xs text-[#6C757B] ml-1">元</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#0D9488]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Train size={14} className="text-[#0D9488]" />
              <span className="text-xs text-[#6C757B]">高铁</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#0D9488]">{trainCount}<span className="text-xs text-[#6C757B] ml-1">次</span></p>
            <p className="text-xs text-[#6C757B] font-mono mt-1">¥{trainTotal.toFixed(0)}</p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#EA580C]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Plane size={14} className="text-[#EA580C]" />
              <span className="text-xs text-[#6C757B]">飞机</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#EA580C]">{planeCount}<span className="text-xs text-[#6C757B] ml-1">次</span></p>
            <p className="text-xs text-[#6C757B] font-mono mt-1">¥{planeTotal.toFixed(0)}</p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#7C3AED]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Car size={14} className="text-[#7C3AED]" />
              <span className="text-xs text-[#6C757B]">打车</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#7C3AED]">{taxiCount}<span className="text-xs text-[#6C757B] ml-1">次</span></p>
            <p className="text-xs text-[#6C757B] font-mono mt-1">¥{taxiTotal.toFixed(0)}</p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#0284C7]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <CarFront size={14} className="text-[#0284C7]" />
              <span className="text-xs text-[#6C757B]">开车</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#0284C7]">{driveCount}<span className="text-xs text-[#6C757B] ml-1">次</span></p>
            <p className="text-xs text-[#6C757B] font-mono mt-1">¥{driveTotal.toFixed(0)}</p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#D97706]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-[#D97706]" />
              <span className="text-xs text-[#6C757B]">住宿</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#D97706]">{hotelCount}<span className="text-xs text-[#6C757B] ml-1">晚</span></p>
            <p className="text-xs text-[#6C757B] font-mono mt-1">¥{hotelTotal.toFixed(0)}</p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#DC2626]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={14} className="text-[#DC2626]" />
              <span className="text-xs text-[#6C757B]">超标</span>
            </div>
            <p className="text-lg md:text-2xl font-bold font-mono text-[#DC2626]">
              {records.filter(r => {
                if (r.type === '住宿' && r.city) return checkOverspend('hotel', r.amount, r.city).isOver;
                if (r.type === '打车') return checkOverspend('taxi', r.amount).isOver;
                return false;
              }).length}
              <span className="text-xs text-[#6C757B] ml-1">条</span>
            </p>
            <p className="text-xs text-[#6C757B] font-mono mt-1">
              ¥{records.reduce((sum, r) => {
                if (r.type === '住宿' && r.city) { const c = checkOverspend('hotel', r.amount, r.city); return sum + c.overAmount; }
                if (r.type === '打车') { const c = checkOverspend('taxi', r.amount); return sum + c.overAmount; }
                return sum;
              }, 0).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab 切换 - 移动端水平滚动 */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-max md:min-w-0">
          {TABS.map(tab => {
            const config = TYPE_CONFIG[tab];
            const Icon = config.icon;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); resetForm(); }}
                className={`flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-3 text-xs md:text-sm font-medium border rounded-xl transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-lg hover:-translate-y-0.5'
                    : 'bg-white border-[#E2E8F0] text-[#6C757B] hover:border-[#E2E8F0] hover:shadow-sm'
                }`}
                style={isActive ? {
                  backgroundColor: config.color,
                  borderColor: config.color,
                  boxShadow: `0 4px 14px ${config.color}40`,
                } : {}}
              >
                <Icon size={14} className="md:hidden" />
                <Icon size={16} className="hidden md:block" />
                {tab}
                <span className={`text-[11px] md:text-xs font-mono px-1 md:px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {records.filter(r => r.type === tab).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 添加/编辑记录表单 */}
      <section className="border border-[#E2E8F0] bg-white p-3 md:p-6 relative overflow-hidden rounded-xl shadow-sm">
        <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(to right, ${activeConfig.color}, ${activeConfig.color}60)` }} />
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          {(() => { const Icon = activeConfig.icon; return <Icon size={16} style={{ color: activeConfig.color }} />; })()}
          <h3 className="text-sm md:text-base font-bold text-[#1A1A2E]">{editId ? `编辑${activeTab}记录` : `添加${activeTab}记录`}</h3>
          <span className="px-2 py-0.5 text-xs font-mono rounded-full" style={{ color: activeConfig.color, backgroundColor: activeConfig.bg, border: `1px solid ${activeConfig.color}25` }}>
            {activeTab}
          </span>
        </div>

        <div className={`grid gap-3 md:gap-4 mb-4 md:mb-5 ${isTaxi ? 'grid-cols-1 md:grid-cols-3' : isDrive ? 'grid-cols-1 md:grid-cols-4' : isHotel ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <Calendar size={12} /> {isHotel ? '住宿日期' : '出行日期'}
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm font-mono focus:outline-none focus:border-[#D97706] transition-colors rounded-lg"
            />
          </div>

          {isTaxi && (
            <div>
              <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">城市（可选）</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="输入城市名称"
                className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#D97706] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
              />
            </div>
          )}

          {isHotel && (
            <div>
              <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">
                住宿城市
                {city.trim() && (
                  <span className={`ml-2 font-normal ${isTier1City(city.trim()) ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                    {isTier1City(city.trim()) ? '一线城市·封顶¥260' : '一般城市·封顶¥220'}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={city}
                onChange={e => {
                  setCity(e.target.value);
                  // 自动调整金额封顶
                  if (amount && parseFloat(amount) > 0) {
                    const max = getHotelMax(e.target.value.trim());
                    if (parseFloat(amount) > max) setAmount(max.toString());
                  }
                }}
                placeholder="输入城市名称"
                className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#D97706] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
              />
            </div>
          )}

          {!isTaxi && !isHotel && (
            <>
              <div>
                <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">出发地</label>
                <input
                  type="text"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  placeholder="从哪里出发"
                  className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#D97706] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">目的地</label>
                <input
                  type="text"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="到哪里去"
                  className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#D97706] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
                />
              </div>
            </>
          )}

          {isDrive && (
            <div>
              <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">公里数</label>
              <div className="relative">
                <input
                  type="number"
                  value={km}
                  onChange={e => setKm(e.target.value)}
                  placeholder="公里"
                  min="0"
                  step="0.1"
                  className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 pr-8 text-sm font-mono focus:outline-none focus:border-[#D97706] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6C757B] text-xs">km</span>
              </div>
              {isDrive && km && parseFloat(km) > 0 && (
                <p className="text-[11px] text-[#0284C7] mt-1">
                  参考油费: ¥{calcDriveFuelCost(parseFloat(km)).toFixed(0)}（按{DRIVE_FUEL_RATE}元/km）
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">
              花费金额 {isTaxi && <span className="text-[#7C3AED] font-normal">（封顶¥{TAXI_MAX}）</span>}
              {isHotel && city.trim() && <span className={`font-normal ${isTier1City(city.trim()) ? 'text-[#DC2626]' : 'text-[#059669]'}`}>（封顶¥{getHotelMax(city.trim())}）</span>}
            </label>
            <div className="flex items-center bg-gray-50 border border-[#E2E8F0] rounded-lg focus-within:border-[#D97706] transition-colors">
              <span className="px-2.5 text-[#D97706] text-sm font-mono select-none">¥</span>
              <input
                type="number"
                value={amount}
                onChange={e => {
                  const val = e.target.value;
                  if (isTaxi && val && parseFloat(val) > TAXI_MAX) {
                    setAmount(TAXI_MAX.toString());
                  } else if (isHotel && val && city.trim() && parseFloat(val) > getHotelMax(city.trim())) {
                    setAmount(getHotelMax(city.trim()).toString());
                  } else {
                    setAmount(val);
                  }
                }}
                placeholder={isTaxi ? `最高${TAXI_MAX}元` : isHotel ? `最高${city.trim() ? getHotelMax(city.trim()) : 220}元` : '金额'}
                min="0"
                max={isTaxi ? TAXI_MAX : isHotel && city.trim() ? getHotelMax(city.trim()) : undefined}
                step="0.01"
                className="flex-1 bg-transparent border-0 text-[#1A1A2E] p-2 md:p-2.5 text-sm font-mono focus:outline-none placeholder:text-[#6C757B]/50"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={handleAdd}
            disabled={!date || !amount || (!isTaxi && !isHotel && (!from.trim() || !to.trim())) || (isHotel && !city.trim())}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 font-bold text-xs md:text-sm rounded-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0 text-white hover:shadow-lg"
            style={{
              background: `linear-gradient(to right, ${activeConfig.color}, ${activeConfig.color}CC)`,
              boxShadow: `0 4px 14px ${activeConfig.color}30`,
            }}
          >
            <Plus size={14} className="md:hidden" />
            <Plus size={16} className="hidden md:block" /> {editId ? '保存修改' : `添加${activeTab}记录`}
          </button>
          <button onClick={() => recognizer.setShow(!recognizer.show)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${recognizer.show ? 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white shadow-[#F59E0B]/20' : 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white hover:shadow-[#F59E0B]/20'}`}
          >
            <Sparkles size={14} /> 智能识别
          </button>
          {editId && (
            <button
              onClick={resetForm}
              className="px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-[#6C757B] border border-[#E2E8F0] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors rounded-lg"
            >
              取消编辑
            </button>
          )}
        </div>
      </section>

      {/* 智能识别面板 */}
      <RecognizerPanel<RecognizedTravelItem>
        show={recognizer.show}
        onToggle={() => recognizer.setShow(!recognizer.show)}
        columns={[
          { key: 'date', label: '日期' },
          { key: 'type', label: '类型' },
          { key: 'from', label: '出发' },
          { key: 'to', label: '目的地' },
          { key: 'amount', label: '金额', type: 'number' },
          { key: 'km', label: '公里', type: 'number' },
        ]}
        onRecognizeText={recognizeTravelContent}
        onRecognizeFile={recognizeTravelContent}
        onApply={handleApplyTravelRecognized}
        applyLabel="填充首条到表单"
        applyHint="将第一条识别结果填入添加表单"
        textareaId="travel-recognizer-text"
      />

      {/* 当前类型的出行记录表格 */}
      <section className="border border-[#E2E8F0] bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            {(() => { const Icon = activeConfig.icon; return <Icon size={16} style={{ color: activeConfig.color }} />; })()}
            <h3 className="text-sm md:text-base font-bold text-[#1A1A2E]">{activeTab}记录</h3>
            {currentRecords.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-mono rounded-full" style={{ color: activeConfig.color, backgroundColor: activeConfig.bg, border: `1px solid ${activeConfig.color}25` }}>
                {currentRecords.length}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs border rounded-lg transition-all duration-200 ${
                saved
                  ? 'border-[#059669] text-[#059669] bg-[#059669]/5'
                  : 'border-[#059669]/40 text-[#059669] hover:bg-[#059669]/5'
              }`}
            >
              <Save size={12} /> {saved ? '已保存' : '保存'}
            </button>
            <button
              onClick={handleClear}
              disabled={records.length === 0}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors disabled:opacity-30 rounded-lg"
            >
              <RotateCcw size={12} /> 清空
            </button>
          </div>
        </div>

        {currentRecords.length === 0 ? (
          <div className="empty-state">
            <Compass size={48} className="empty-state-icon" />
            <p className="empty-state-title">暂无出行记录</p>
            <p className="empty-state-desc">点击上方"添加"按钮开始记录</p>
          </div>
        ) : (
          <>
            {/* 移动端卡片布局 */}
            <div className="md:hidden p-3 space-y-2">
              {currentRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-[#E2E8F0] rounded-lg p-3 bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-[#1A1A2E]">{record.date.slice(5)}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: activeConfig.color }}>¥{record.amount.toFixed(2)}
                      {isHotel && (() => {
                        const check = checkOverspend('hotel', record.amount, record.city);
                        return check.isOver ? (
                          <span className="text-[11px] text-[#DC2626] ml-1">超标¥{check.overAmount.toFixed(0)}</span>
                        ) : null;
                      })()}
                      {isTaxi && (() => {
                        const check = checkOverspend('taxi', record.amount);
                        return check.isOver ? (
                          <span className="text-[11px] text-[#DC2626] ml-1">超标¥{check.overAmount.toFixed(0)}</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  {!isTaxi && !isHotel && (
                    <div className="flex items-center gap-1.5 text-xs text-[#1A1A2E] mb-1.5">
                      <MapPin size={12} className="text-[#6C757B] shrink-0" />
                      <span className="font-medium">{record.from}</span>
                      <ArrowRight size={10} className="text-[#6C757B] shrink-0" />
                      <span className="font-medium">{record.to}</span>
                    </div>
                  )}
                  {isTaxi && record.city && (
                    <div className="flex items-center gap-1.5 text-xs mb-1.5">
                      <MapPin size={12} className="text-[#7C3AED] shrink-0" />
                      <span className="font-medium text-[#1A1A2E]">{record.city}</span>
                    </div>
                  )}
                  {isHotel && record.city && (
                    <div className="flex items-center gap-1.5 text-xs mb-1.5">
                      <MapPin size={12} className="text-[#D97706] shrink-0" />
                      <span className="font-medium text-[#1A1A2E]">{record.city}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[11px] ${record.isTier1 ? 'bg-[#DC2626]/10 text-[#DC2626]' : 'bg-[#059669]/10 text-[#059669]'}`}>
                        {record.isTier1 ? '一线城市' : '一般城市'}
                      </span>
                      {isHotel && (() => {
                        const check = checkOverspend('hotel', record.amount, record.city);
                        return check.isOver ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setRecords(prev => prev.map(r => r.id === record.id ? { ...r, approved: !r.approved } : r)); }}
                            className={`ml-1 px-1.5 py-0.5 text-[11px] rounded ${record.approved ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}
                          >
                            {record.approved ? '已审批' : '待审批'}
                          </button>
                        ) : null;
                      })()}
                    </div>
                  )}
                  {isDrive && record.km && (
                    <div className="text-xs text-[#0284C7] font-mono mb-1.5">
                      {record.km} km
                      {record.km && (
                        <span className="text-[#6C757B] ml-2">参考油费¥{calcDriveFuelCost(record.km).toFixed(0)}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-[#E2E8F0]/60">
                    <button
                      onClick={() => handleEdit(record)}
                      className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#0D9488] hover:bg-[#0D9488]/5 transition-colors rounded-md text-xs"
                      title="编辑"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg> 编辑
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-md text-xs"
                      title="删除"
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                </div>
              ))}
              {/* 移动端合计卡片 */}
              <div
                className="rounded-lg p-3 flex items-center justify-between"
                style={{ backgroundColor: `${activeConfig.color}08`, borderTop: `2px solid ${activeConfig.color}20` }}
              >
                <div>
                  <span className="text-sm font-bold text-[#1A1A2E]">合计</span>
                  <span className="text-xs text-[#6C757B] ml-2">{currentRecords.length} 条记录</span>
                </div>
                <div className="flex items-center gap-3">
                  {isDrive && (
                    <span className="font-mono text-xs text-[#0284C7]">
                      {currentRecords.reduce((sum, r) => sum + (r.km || 0), 0)} km
                    </span>
                  )}
                  <span className="font-mono text-base font-bold" style={{ color: activeConfig.color }}>¥{currentTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 桌面端表格布局 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-[#6C757B] font-medium text-xs p-3 pl-4 uppercase tracking-wider">日期</th>
                    {!isTaxi && !isHotel && <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">路线</th>}
                    {isTaxi && <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">城市</th>}
                    {isHotel && <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">城市</th>}
                    {isHotel && <th className="text-center text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">城市类型</th>}
                    {isDrive && <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">公里数</th>}
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">花费</th>
                    <th className="text-center text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider w-24">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`border-b border-[#E2E8F0]/60 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-gray-50`}
                    >
                      <td className="p-3 pl-4 font-mono text-[#1A1A2E] text-sm">{record.date.slice(5)}</td>
                      {!isTaxi && !isHotel && (
                        <td className="p-3 text-[#1A1A2E]">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{record.from}</span>
                            <ArrowRight size={12} className="text-[#6C757B] shrink-0" />
                            <span className="font-medium">{record.to}</span>
                          </div>
                        </td>
                      )}
                      {isTaxi && (
                        <td className="p-3 text-[#1A1A2E]">
                          {record.city ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-[#7C3AED] shrink-0" />
                              <span className="font-medium">{record.city}</span>
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      {isHotel && (
                        <td className="p-3 text-[#1A1A2E]">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-[#D97706] shrink-0" />
                            <span className="font-medium">{record.city}</span>
                          </div>
                        </td>
                      )}
                      {isHotel && (
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${record.isTier1 ? 'bg-[#DC2626]/10 text-[#DC2626]' : 'bg-[#059669]/10 text-[#059669]'}`}>
                            {record.isTier1 ? '一线城市' : '一般城市'}
                          </span>
                          {isHotel && (() => {
                            const check = checkOverspend('hotel', record.amount, record.city);
                            return check.isOver ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setRecords(prev => prev.map(r => r.id === record.id ? { ...r, approved: !r.approved } : r)); }}
                                className={`ml-1 px-1.5 py-0.5 text-[11px] rounded ${record.approved ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#DC2626]/10 text-[#DC2626]'}`}
                              >
                                {record.approved ? '已审批' : '待审批'}
                              </button>
                            ) : null;
                          })()}
                        </td>
                      )}
                      {isDrive && (
                        <td className="p-3 text-right font-mono text-[#0284C7] text-sm">
                          {record.km ? (
                            <span>{record.km} km <span className="text-[#6C757B] text-xs">≈¥{calcDriveFuelCost(record.km).toFixed(0)}</span></span>
                          ) : '-'}
                        </td>
                      )}
                      <td className="p-3 text-right font-mono font-medium" style={{ color: activeConfig.color }}>¥{record.amount.toFixed(2)}
                        {isHotel && (() => {
                          const check = checkOverspend('hotel', record.amount, record.city);
                          return check.isOver ? (
                            <span className="text-[11px] text-[#DC2626] ml-1">超标¥{check.overAmount.toFixed(0)}</span>
                          ) : null;
                        })()}
                        {isTaxi && (() => {
                          const check = checkOverspend('taxi', record.amount);
                          return check.isOver ? (
                            <span className="text-[11px] text-[#DC2626] ml-1">超标¥{check.overAmount.toFixed(0)}</span>
                          ) : null;
                        })()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(record)}
                            className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#0D9488] hover:bg-[#0D9488]/5 transition-colors rounded-md text-xs"
                            title="编辑"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg> 编辑
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-md text-xs"
                            title="删除"
                          >
                            <Trash2 size={14} /> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: `${activeConfig.color}08`, borderTop: `2px solid ${activeConfig.color}20` }}>
                    <td className="p-3 pl-4">
                      <span className="text-sm font-bold text-[#1A1A2E]">合计</span>
                      <span className="text-xs text-[#6C757B] ml-2">{currentRecords.length} 条记录</span>
                    </td>
                    {!isTaxi && !isHotel && <td></td>}
                    {isTaxi && <td></td>}
                    {isHotel && <td></td>}
                    {isHotel && <td></td>}
                    {isDrive && (
                      <td className="p-3 text-right font-mono text-sm text-[#0284C7]">
                        {currentRecords.reduce((sum, r) => sum + (r.km || 0), 0)} km
                      </td>
                    )}
                    <td className="p-3 text-right font-mono text-xl font-bold" style={{ color: activeConfig.color }}>¥{currentTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
