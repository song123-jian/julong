﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState } from 'react';
import { Calculator, Copy, CheckCircle, Wallet, MapPin, Compass } from 'lucide-react';
import { isTier1City, HOTEL_TIER1_MAX, HOTEL_NORMAL_MAX, TAXI_MAX, TRANSPORT_TIER1_MAX, TRANSPORT_NORMAL_MAX, ALLOWANCE_NANJING, ALLOWANCE_OTHER } from '../config/expenseRules';
import { copyText } from '@/lib/utils';

const EXPENSE_RULES = {
  allowance: {
    label: '出差补贴',
    icon: '¥',
    color: '#D97706',
    items: [
      { area: '南京省内', amount: ALLOWANCE_NANJING, unit: '元/天', note: '封顶' },
      { area: '其他地区', amount: ALLOWANCE_OTHER, unit: '元/天', note: '封顶' },
    ],
  },
  transport: {
    label: '交通报销',
    icon: '🚗',
    color: '#0D9488',
    items: [
      { area: '一般地区', amount: TRANSPORT_NORMAL_MAX, unit: '元/天', note: '封顶' },
      { area: '一线城市', amount: TRANSPORT_TIER1_MAX, unit: '元/天', note: '封顶' },
    ],
  },
  hotel: {
    label: '住宿标准',
    icon: '🏨',
    color: '#059669',
    items: [
      { area: '一般地区', amount: HOTEL_NORMAL_MAX, unit: '元/天', note: '封顶' },
      { area: '一线城市', amount: HOTEL_TIER1_MAX, unit: '元/天', note: '封顶' },
    ],
  },
};

// 财政部差旅费标准中住宿费较高的城市（部级900元以上）
const HIGH_COST_CITIES = [
  { city: '北京', standard: 1100, note: '最高档' },
  { city: '上海', standard: 1100, note: '最高档' },
  { city: '广州', standard: 900, note: '第二档' },
  { city: '深圳', standard: 900, note: '第二档' },
  { city: '南京', standard: 900, note: '第二档' },
  { city: '杭州', standard: 900, note: '第二档' },
  { city: '厦门', standard: 900, note: '第二档' },
  { city: '成都', standard: 900, note: '第二档' },
  { city: '郑州', standard: 900, note: '第二档' },
  { city: '昆明', standard: 900, note: '第二档' },
  { city: '福州', standard: 900, note: '第二档' },
];

// 出行记录类型定义（与 Travel.tsx 保持一致）
interface TravelRecordItem {
  id: string;
  date: string;
  type: string;
  from: string;
  to: string;
  amount: number;
  km?: number;
  city?: string;
  isTier1?: boolean;
  approved?: boolean;
}

export default function Expenses() {
  const [days, setDays] = useState<string>('');
  const [isTier1, setIsTier1] = useState(false);
  const [isNanjingIntra, setIsNanjingIntra] = useState(false);
  const [city, setCity] = useState('');
  const [result, setResult] = useState<{ allowance: number; transport: number; hotel: number; total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [actualExpense, setActualExpense] = useState<{ hotel: number; taxi: number; drive: number; total: number; hotelCount: number; taxiCount: number; driveCount: number; dateRange: string } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFetchActual = () => {
    try {
      const raw = localStorage.getItem('travel_records');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      // v8 修复：防御性过滤，确保每条记录有 id 和 type 字段
      const records: TravelRecordItem[] = parsed.filter(
        (r: unknown): r is TravelRecordItem => r != null && typeof r === 'object' && typeof (r as TravelRecordItem).id === 'string' && typeof (r as TravelRecordItem).type === 'string'
      );

      const cityRecords = city.trim()
        ? records.filter((r) => r.city === city.trim() || r.from === city.trim() || r.to === city.trim())
        : records;

      // 按日期范围筛选
      let dateRecords = cityRecords;
      if (startDate || endDate) {
        dateRecords = cityRecords.filter((r) => {
          if (!r.date) return false;
          const d = r.date;
          if (startDate && d < startDate) return false;
          if (endDate && d > endDate) return false;
          return true;
        });
      }

      const hotelTotal = dateRecords.filter((r) => r.type === '住宿').reduce((sum, r) => sum + r.amount, 0);
      const taxiTotal = dateRecords.filter((r) => r.type === '打车').reduce((sum, r) => sum + r.amount, 0);
      const driveTotal = dateRecords.filter((r) => r.type === '开车').reduce((sum, r) => sum + r.amount, 0);
      const hotelCount = dateRecords.filter((r) => r.type === '住宿').length;
      const taxiCount = dateRecords.filter((r) => r.type === '打车').length;
      const driveCount = dateRecords.filter((r) => r.type === '开车').length;

      const rangeLabel = startDate && endDate ? `${startDate} 至 ${endDate}` : startDate ? `${startDate} 起` : endDate ? `截至 ${endDate}` : '全部日期';

      setActualExpense({
        hotel: hotelTotal,
        taxi: taxiTotal,
        drive: driveTotal,
        total: hotelTotal + taxiTotal + driveTotal,
        hotelCount,
        taxiCount,
        driveCount,
        dateRange: rangeLabel,
      });
    } catch {
      // 忽略解析错误
    }
  };

  const handleCalc = () => {
    const d = parseInt(days) || 0;
    if (d <= 0) return;
    // 如果输入了城市，自动判断城市类型
    const tier1 = city.trim() ? isTier1City(city.trim()) : isTier1;
    const allowance = isNanjingIntra ? ALLOWANCE_NANJING * d : ALLOWANCE_OTHER * d;
    const transport = tier1 ? TRANSPORT_TIER1_MAX * d : TRANSPORT_NORMAL_MAX * d;
    const hotel = tier1 ? HOTEL_TIER1_MAX * d : HOTEL_NORMAL_MAX * d;
    setResult({ allowance, transport, hotel, total: allowance + transport + hotel });
  };

  // 城市输入时自动更新目的地类型
  const handleCityChange = (value: string) => {
    setCity(value);
    if (value.trim()) {
      setIsTier1(isTier1City(value.trim()));
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `出差费用计算结果\n==================\n天数: ${days}天\n城市: ${city.trim() || '未指定'}\n地区: ${isTier1 ? '一线城市' : '一般地区'}\n\n出差补贴: ¥${result.allowance}\n交通报销: ¥${result.transport}\n住宿标准: ¥${result.hotel}\n------------------\n合计: ¥${result.total}`;
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gradient-to-br from-[#0284C7] to-[#0D9488] rounded-lg shadow-md">
          <Wallet size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold gradient-text">费用标准</h2>
          <p className="text-xs text-[#6C757B] mt-0.5">出差补贴、交通报销、住宿标准</p>
        </div>
        <button
          onClick={() => window.location.hash = '/travel'}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#D97706]/40 text-[#D97706] hover:bg-[#D97706]/5 rounded-lg transition-colors"
        >
          <Compass size={12} /> 出行记录
        </button>
      </div>

      {/* 费用标准卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {Object.values(EXPENSE_RULES).map(rule => (
          <div key={rule.label} className="border border-[#E2E8F0] bg-white p-3 md:p-5 rounded-xl card-hover relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: rule.color }} />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{rule.icon}</span>
              <h3 className="text-sm font-bold" style={{ color: rule.color }}>{rule.label}</h3>
            </div>
            <div className="space-y-2">
              {rule.items.map(item => (
                <div key={item.area} className="flex justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-[#1A1A2E]">{item.area}</p>
                    <p className="text-xs text-[#6C757B]">{item.note}</p>
                  </div>
                  <span className="font-mono font-bold text-sm" style={{ color: rule.color }}>
                    ¥{item.amount}/{item.unit.replace('元/', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 一线城市参考（依据财政部标准） */}
      <section className="border border-[#E2E8F0] bg-white p-3 md:p-5 rounded-xl shadow-sm">
        <h3 className="text-sm font-bold text-[#6C757B] mb-1">一线城市参考</h3>
        <p className="text-xs text-[#6C757B]/60 mb-3">依据财政部《中央和国家机关差旅住宿费标准》，部级住宿费900元以上城市</p>
        <div className="overflow-x-auto">
          <div className="flex flex-wrap gap-2">
            {HIGH_COST_CITIES.map(item => (
              <span key={item.city} className={`px-3 py-1.5 text-xs font-mono border rounded-md whitespace-nowrap ${
                item.note === '最高档' ? 'bg-[#D97706]/5 border-[#D97706]/20 text-[#D97706]' : 'bg-gray-50 border-[#E2E8F0] text-[#1A1A2E]'
              }`}>
                {item.city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 费用计算器 */}
      <section>
        <h3 className="text-base md:text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-4 md:h-5 bg-gradient-to-b from-[#D97706] to-[#EA580C] rounded-full" />
          <Calculator size={18} /> 费用计算器
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-3 md:p-6 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#D97706] via-[#0D9488] to-[#059669]" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4">
            <div>
              <label className="text-xs text-[#6C757B] mb-1 block font-medium">出差天数</label>
              <input
                type="number"
                value={days}
                onChange={e => setDays(e.target.value)}
                placeholder="输入天数"
                min="1"
                className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#D97706] rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-[#6C757B] mb-1 block font-medium">
                目的地城市
                {city.trim() && (
                  <span className={`ml-1 font-normal ${isTier1City(city.trim()) ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                    · {isTier1City(city.trim()) ? '一线城市' : '一般城市'}
                  </span>
                )}
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6C757B]" />
                <input
                  type="text"
                  value={city}
                  onChange={e => handleCityChange(e.target.value)}
                  placeholder="输入城市自动识别类型"
                  className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 pl-8 text-sm focus:outline-none focus:border-[#D97706] rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6C757B] mb-1 block font-medium">目的地类型</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsTier1(false)}
                  className={`flex-1 px-3 py-2.5 text-xs border rounded-lg transition-all duration-200 ${
                    !isTier1 ? 'border-[#0D9488] text-[#0D9488] bg-[#0D9488]/5' : 'border-[#E2E8F0] text-[#6C757B] hover:border-[#0D9488]/40'
                  }`}
                >
                  一般地区
                </button>
                <button
                  onClick={() => setIsTier1(true)}
                  className={`flex-1 px-3 py-2.5 text-xs border rounded-lg transition-all duration-200 ${
                    isTier1 ? 'border-[#D97706] text-[#D97706] bg-[#D97706]/5' : 'border-[#E2E8F0] text-[#6C757B] hover:border-[#D97706]/40'
                  }`}
                >
                  一线城市
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6C757B] mb-1 block font-medium">南京省内出差</label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsNanjingIntra(true); }}
                  className={`flex-1 px-3 py-2.5 text-xs border rounded-lg transition-all duration-200 ${
                    isNanjingIntra ? 'border-[#059669] text-[#059669] bg-[#059669]/5' : 'border-[#E2E8F0] text-[#6C757B] hover:border-[#059669]/40'
                  }`}
                >
                  是
                </button>
                <button
                  onClick={() => { setIsNanjingIntra(false); }}
                  className={`flex-1 px-3 py-2.5 text-xs border rounded-lg transition-all duration-200 ${
                    !isNanjingIntra ? 'border-[#6C757B] text-[#6C757B] bg-gray-50' : 'border-[#E2E8F0] text-[#6C757B] hover:border-[#6C757B]/40'
                  }`}
                >
                  否
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
            <div>
              <label className="text-xs text-[#6C757B] mb-1 block font-medium">开始日期（可选）</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#D97706] rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-[#6C757B] mb-1 block font-medium">结束日期（可选）</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#D97706] rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCalc}
              disabled={!days || parseInt(days) <= 0}
              className="px-6 py-2.5 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-[#D97706]/20 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0"
            >
              计算
            </button>
            <button
              onClick={handleFetchActual}
              className="px-4 py-2.5 border border-[#0D9488]/40 text-[#0D9488] font-bold text-sm rounded-lg hover:bg-[#0D9488]/5 transition-all"
            >
              拉取实际花费
            </button>
          </div>

          {result && (
            <div className="mt-4 md:mt-6 border-t border-[#E2E8F0] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h4 className="text-sm font-bold text-[#1A1A2E]">计算结果</h4>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-[#6C757B] hover:text-[#D97706] transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-[#D97706]/30 hover:bg-[#D97706]/5"
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? '已复制' : '复制明细'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                  <span className="text-xs md:text-sm text-[#6C757B]">出差补贴 ({isNanjingIntra ? `南京省内${ALLOWANCE_NANJING}元/天` : `其他${ALLOWANCE_OTHER}元/天`})</span>
                  <span className="font-mono text-sm text-[#D97706]">¥{result.allowance}</span>
                </div>
                <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                  <span className="text-xs md:text-sm text-[#6C757B]">交通报销 ({isTier1 ? `高消费${TRANSPORT_TIER1_MAX}元/天` : `一般${TRANSPORT_NORMAL_MAX}元/天`})</span>
                  <span className="font-mono text-sm text-[#0D9488]">¥{result.transport}</span>
                </div>
                <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                  <span className="text-xs md:text-sm text-[#6C757B]">住宿标准 ({isTier1 ? `高消费${HOTEL_TIER1_MAX}元/天` : `一般${HOTEL_NORMAL_MAX}元/天`})</span>
                  <span className="font-mono text-sm text-[#059669]">¥{result.hotel}</span>
                </div>
                <div className="flex flex-wrap justify-between items-center p-3 md:p-4 bg-gradient-to-r from-[#D97706]/5 to-[#EA580C]/5 border border-[#D97706]/20 rounded-lg gap-1 md:col-span-2">
                  <span className="text-sm font-bold text-[#D97706]">合计</span>
                  <span className="font-mono text-lg font-bold text-[#D97706]">¥{result.total}</span>
                </div>
              </div>
              {actualExpense && result && (
                <div className="mt-4 border-t border-[#E2E8F0] pt-4">
                  <h4 className="text-sm font-bold text-[#1A1A2E] mb-1">实际花费 vs 标准</h4>
                  <p className="text-xs text-[#6C757B] mb-3">日期范围: {actualExpense.dateRange}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                      <span className="text-xs md:text-sm text-[#6C757B]">出差补贴 ({days}天)</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-[#D97706]">¥{result.allowance}</span>
                        <span className="text-[11px] text-[#6C757B]">固定标准</span>
                      </div>
                    </div>
                    {actualExpense.hotelCount > 0 && (
                      <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                        <span className="text-xs md:text-sm text-[#6C757B]">住宿实际 ({actualExpense.hotelCount}晚)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#059669]">¥{actualExpense.hotel}</span>
                          {(() => {
                            const standard = actualExpense.hotelCount * (isTier1 ? HOTEL_TIER1_MAX : HOTEL_NORMAL_MAX);
                            const diff = actualExpense.hotel - standard;
                            return diff > 0 ? (
                              <span className="text-[11px] text-[#DC2626]">超标¥{diff.toFixed(0)}</span>
                            ) : (
                              <span className="text-[11px] text-[#059669]">节省¥{Math.abs(diff).toFixed(0)}</span>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {actualExpense.taxiCount > 0 && (
                      <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                        <span className="text-xs md:text-sm text-[#6C757B]">打车实际 ({actualExpense.taxiCount}次)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#7C3AED]">¥{actualExpense.taxi}</span>
                          {(() => {
                            const standard = actualExpense.taxiCount * TAXI_MAX;
                            const diff = actualExpense.taxi - standard;
                            return diff > 0 ? (
                              <span className="text-[11px] text-[#DC2626]">超标¥{diff.toFixed(0)}</span>
                            ) : (
                              <span className="text-[11px] text-[#059669]">节省¥{Math.abs(diff).toFixed(0)}</span>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    {actualExpense.driveCount > 0 && (
                      <div className="flex flex-wrap justify-between items-center p-2 md:p-3 bg-gray-50 rounded-lg gap-1">
                        <span className="text-xs md:text-sm text-[#6C757B]">开车实际 ({actualExpense.driveCount}次)</span>
                        <span className="font-mono text-sm text-[#0284C7]">¥{actualExpense.drive}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-between items-center p-3 md:p-4 bg-gradient-to-r from-[#0D9488]/5 to-[#059669]/5 border border-[#0D9488]/20 rounded-lg gap-1 md:col-span-2">
                      <span className="text-sm font-bold text-[#0D9488]">实际总花费（含补贴）</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const totalWithAllowance = actualExpense.total + result.allowance;
                          return (
                            <>
                              <span className="font-mono text-lg font-bold text-[#0D9488]">¥{totalWithAllowance}</span>
                              {(() => {
                                const diff = totalWithAllowance - result.total;
                                return diff > 0 ? (
                                  <span className="text-xs text-[#DC2626]">超标¥{diff.toFixed(0)}</span>
                                ) : (
                                  <span className="text-xs text-[#059669]">节省¥{Math.abs(diff).toFixed(0)}</span>
                                );
                              })()}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
