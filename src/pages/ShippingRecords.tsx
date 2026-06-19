﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RotateCcw, Download, Package, Calendar, User, Hash, DollarSign, FileSpreadsheet, FileText, FileJson, FileDown, TrendingUp, Receipt, CheckSquare, Square, Tag, Percent, Sparkles } from 'lucide-react';
import { recognizeShippingContent, type RecognizedShippingItem } from '../utils/contentRecognizer';
import { useRecognizer } from '../hooks/useRecognizer';
import { RecognizerPanel } from '../components/RecognizerPanel';
import { createExporter, type ExportColumn } from '../utils/exportFactory';
import { generateId } from '../lib/utils';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ShippingRecord {
  id: string;
  customer: string;
  date: string;
  material: string;     // 材料名称
  grade: string;        // 牌号
  quantity: number;
  unitPrice: number;    // 售价（元/kg）
  costPrice: number;    // 成本价（元/kg）
  amount: number;       // 售价 × 数量
  grossProfit: number;  // 毛利 = (售价 - 成本价) × 数量
  grossMargin: number;  // 毛利率 = (售价 - 成本价) / 售价 × 100%
}

const STORAGE_KEY = 'shipping_records';

function normalizeRecord(r: Record<string, unknown>): ShippingRecord {
  return {
    id: (r.id as string) ?? '',
    customer: (r.customer as string) ?? '',
    date: (r.date as string) ?? '',
    material: (r.material as string) ?? '',
    grade: (r.grade as string) ?? '',
    quantity: typeof r.quantity === 'number' ? r.quantity : 0,
    unitPrice: typeof r.unitPrice === 'number' ? r.unitPrice : 0,
    costPrice: typeof r.costPrice === 'number' ? r.costPrice : 0,
    amount: typeof r.amount === 'number' ? r.amount : 0,
    grossProfit: typeof r.grossProfit === 'number' ? r.grossProfit : 0,
    grossMargin: typeof r.grossMargin === 'number' ? r.grossMargin : 0,
  };
}

function loadRecords(): ShippingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // 过滤掉格式不匹配的记录，确保必要字段存在且类型正确，并兼容历史数据
    return parsed
      .filter((r): r is ShippingRecord =>
        r != null && typeof r === 'object' &&
        typeof r.customer === 'string' &&
        typeof r.date === 'string' &&
        typeof r.quantity === 'number' &&
        typeof r.unitPrice === 'number' &&
        typeof r.amount === 'number'
      )
      .map(r => normalizeRecord(r as unknown as Record<string, unknown>));
  } catch {
    return [];
  }
}

const MOCK_RECORDS: ShippingRecord[] = [
  { id: 's1', customer: '上海越联橡塑制品有限公司', date: '2026-06-11', material: 'PP', grade: 'T30S', quantity: 1000, unitPrice: 14, costPrice: 11, amount: 14000, grossProfit: 3000, grossMargin: 21.43 },
  { id: 's2', customer: '金发科技股份有限公司', date: '2026-06-10', material: 'ABS', grade: 'PA-747', quantity: 500, unitPrice: 28.5, costPrice: 22, amount: 14250, grossProfit: 3250, grossMargin: 22.81 },
  { id: 's3', customer: '道恩集团有限公司', date: '2026-06-09', material: 'PE', grade: '5000S', quantity: 2000, unitPrice: 11.8, costPrice: 9.5, amount: 23600, grossProfit: 4600, grossMargin: 19.49 },
  { id: 's4', customer: '上海越联橡塑制品有限公司', date: '2026-06-08', material: 'PP', grade: 'T30S', quantity: 1500, unitPrice: 14, costPrice: 11, amount: 21000, grossProfit: 4500, grossMargin: 21.43 },
  { id: 's5', customer: '中广核俊尔新材料有限公司', date: '2026-06-07', material: 'PC', grade: '1100', quantity: 800, unitPrice: 22, costPrice: 18, amount: 17600, grossProfit: 3200, grossMargin: 18.18 },
  { id: 's6', customer: '金发科技股份有限公司', date: '2026-06-05', material: 'PA6', grade: '1013B', quantity: 300, unitPrice: 24, costPrice: 20, amount: 7200, grossProfit: 1200, grossMargin: 16.67 },
  { id: 's7', customer: '道恩集团有限公司', date: '2026-06-03', material: 'PE', grade: '5000S', quantity: 1500, unitPrice: 11.5, costPrice: 9.5, amount: 17250, grossProfit: 3000, grossMargin: 17.39 },
  { id: 's8', customer: '上海越联橡塑制品有限公司', date: '2026-06-01', material: 'PP', grade: 'K8003', quantity: 2000, unitPrice: 13.8, costPrice: 11.2, amount: 27600, grossProfit: 5200, grossMargin: 18.84 },
];

const SHIPPING_COLUMNS: ExportColumn<ShippingRecord>[] = [
  { key: 'customer', label: '客户名字' },
  { key: 'date', label: '发货日期' },
  { key: 'material', label: '材料名称' },
  { key: 'grade', label: '牌号' },
  { key: 'quantity', label: '数量', isNumeric: true, align: 'right' },
  { key: 'unitPrice', label: '单价', isNumeric: true, align: 'right', format: v => `¥${Number(v).toFixed(2)}` },
  { key: 'costPrice', label: '成本价', isNumeric: true, align: 'right', format: v => `¥${Number(v).toFixed(2)}` },
  { key: 'amount', label: '金额', isNumeric: true, align: 'right', format: v => `¥${Number(v).toFixed(2)}` },
  { key: 'grossProfit', label: '毛利', isNumeric: true, align: 'right', format: v => `¥${Number(v).toFixed(2)}` },
  { key: 'grossMargin', label: '毛利率', align: 'right', format: (v, r) => r.costPrice > 0 ? `${Number(v).toFixed(2)}%` : '--' },
];

const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV', icon: FileText, ext: '.csv', desc: '逗号分隔值' },
  { key: 'tsv', label: 'TSV', icon: FileDown, ext: '.tsv', desc: '制表符分隔值' },
  { key: 'json', label: 'JSON', icon: FileJson, ext: '.json', desc: 'JSON数据格式' },
  { key: 'html', label: 'HTML', icon: FileSpreadsheet, ext: '.html', desc: '网页表格' },
  { key: 'xml', label: 'XML', icon: FileText, ext: '.xml', desc: 'XML数据格式' },
  { key: 'md', label: 'Markdown', icon: FileText, ext: '.md', desc: 'Markdown文档' },
];

// 毛利率显示辅助函数
function formatGrossMargin(record: ShippingRecord): { text: string; color: string } {
  if (record.costPrice === 0) return { text: '--', color: 'text-[#6C757B]' };
  if (record.grossMargin > 0) return { text: `+${record.grossMargin.toFixed(2)}%`, color: 'text-[#059669]' };
  if (record.grossMargin < 0) return { text: `${record.grossMargin.toFixed(2)}%`, color: 'text-[#DC2626]' };
  return { text: '0%', color: 'text-[#6C757B]' };
}

export default function ShippingRecords() {
  const [records, setRecords] = useLocalStorage<ShippingRecord[]>(STORAGE_KEY, () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return MOCK_RECORDS;
    return loadRecords();
  });
  const exporter = createExporter({ columns: SHIPPING_COLUMNS, filename: '发货记录', title: '发货记录' });
  const [customer, setCustomer] = useState('');
  const [material, setMaterial] = useState('');
  const [grade, setGrade] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [saved, setSaved] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 智能识别
  const recognizer = useRecognizer<RecognizedShippingItem>();

  // 监听报价单页面的数据变更
  useEffect(() => {
    const handleUpdate = () => {
      const fresh = loadRecords();
      setRecords(fresh);
    };
    window.addEventListener('shipping-records-updated', handleUpdate);
    return () => window.removeEventListener('shipping-records-updated', handleUpdate);
  }, []);

  const resetForm = () => {
    setCustomer('');
    setMaterial('');
    setGrade('');
    setDate(new Date().toISOString().slice(0, 10));
    setQuantity('');
    setUnitPrice('');
    setCostPrice('');
    setEditId(null);
    recognizer.reset();
  };

  const handleAdd = () => {
    if (!customer.trim() || !date || !quantity || !unitPrice) return;
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const cost = parseFloat(costPrice) || 0;
    if (qty <= 0 || price <= 0) return; // 阻止零和负数
    const amount = qty * price;
    const grossProfit = (price - cost) * qty;
    const grossMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
    if (editId) {
      setRecords(prev => prev.map(r => r.id === editId ? { ...r, customer: customer.trim(), material: material.trim(), grade: grade.trim(), date, quantity: qty, unitPrice: price, costPrice: cost, amount, grossProfit, grossMargin } : r));
      setEditId(null);
    } else {
      const newRecord: ShippingRecord = {
        id: generateId(),
        customer: customer.trim(),
        material: material.trim(),
        grade: grade.trim(),
        date,
        quantity: qty,
        unitPrice: price,
        costPrice: cost,
        amount,
        grossProfit,
        grossMargin,
      };
      setRecords(prev => [...prev, newRecord]);
    }
    resetForm();
  };

  const handleEdit = (record: ShippingRecord) => {
    setEditId(record.id);
    setCustomer(record.customer);
    setMaterial(record.material);
    setGrade(record.grade);
    setDate(record.date);
    setQuantity(record.quantity.toString());
    setUnitPrice(record.unitPrice.toString());
    setCostPrice(record.costPrice.toString());
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    if (editId === id) resetForm();
  };

  const handleClear = () => {
    if (records.length === 0) return;
    setRecords([]);
    setSelectedIds(new Set());
    resetForm();
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 选择相关
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedRecords.map(r => r.id)));
    }
  };

  const isAllSelected = sortedRecords.length > 0 && selectedIds.size === sortedRecords.length;

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  };

  // 导出
  const handleExport = async (format: string) => {
    const exportData = selectedIds.size > 0
      ? records.filter(r => selectedIds.has(r.id))
      : records;
    if (exportData.length === 0) return;
    switch (format) {
      case 'csv': await exporter.csv(exportData); break;
      case 'tsv': await exporter.tsv(exportData); break;
      case 'json': await exporter.json(exportData); break;
      case 'html': await exporter.html(exportData); break;
      case 'xml': await exporter.xml(exportData); break;
      case 'md': await exporter.md(exportData); break;
    }
    setShowExport(false);
  };

  // 智能识别处理 - 使用 useRecognizer hook

  const handleApplyShippingRecognized = (items: RecognizedShippingItem[]) => {
    if (items.length === 0) return;
    // Fill the first recognized item into the form
    const first = items[0];
    if (first.customer) setCustomer(first.customer);
    if (first.date) setDate(first.date);
    if (first.material) setMaterial(first.material);
    if (first.grade) setGrade(first.grade);
    if (first.quantity > 0) setQuantity(first.quantity.toString());
    if (first.unitPrice > 0) setUnitPrice(first.unitPrice.toString());
    if (first.costPrice > 0) setCostPrice(first.costPrice.toString());
  };

  // 统计
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const customerCount = new Set(records.map(r => r.customer)).size;
  const totalGrossProfit = records.reduce((sum, r) => sum + r.grossProfit, 0);
  const recordsWithCost = records.filter(r => r.costPrice > 0);
  const avgGrossMargin = recordsWithCost.length > 0
    ? recordsWithCost.reduce((sum, r) => sum + r.grossMargin, 0) / recordsWithCost.length
    : 0;

  // 选中记录的统计
  const selectedRecords = records.filter(r => selectedIds.has(r.id));
  const selectedQuantity = selectedRecords.reduce((sum, r) => sum + r.quantity, 0);
  const selectedAmount = selectedRecords.reduce((sum, r) => sum + r.amount, 0);

  // 自动计算金额
  const previewAmount = quantity && unitPrice ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2) : '0.00';
  const previewCostPrice = parseFloat(costPrice) || 0;
  const previewUnitPrice = parseFloat(unitPrice) || 0;
  const previewQty = parseFloat(quantity) || 0;
  const previewGrossProfit = (previewUnitPrice - previewCostPrice) * previewQty;
  const previewGrossMargin = previewCostPrice > 0 && previewUnitPrice > 0
    ? ((previewUnitPrice - previewCostPrice) / previewUnitPrice * 100).toFixed(2)
    : '--';

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gradient-to-br from-[#059669] to-[#0D9488] rounded-lg shadow-md">
          <Package size={18} className="text-white md:hidden" />
          <Package size={20} className="text-white hidden md:block" />
        </div>
        <div>
          <h2 className="text-lg md:text-2xl font-bold gradient-text">发货记录</h2>
          <p className="text-xs text-[#6C757B] mt-0.5">记录客户发货信息，管理发货数量与金额</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#059669]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={14} className="text-[#059669]" />
              <span className="text-xs text-[#6C757B]">总记录</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono text-[#059669]">{records.length}<span className="text-xs text-[#6C757B] ml-1">条</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#D97706]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-[#D97706]" />
              <span className="text-xs text-[#6C757B]">客户数</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono text-[#D97706]">{customerCount}<span className="text-xs text-[#6C757B] ml-1">个</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#0284C7]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Hash size={14} className="text-[#0284C7]" />
              <span className="text-xs text-[#6C757B]">总数量</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono text-[#0284C7]">{totalQuantity}<span className="text-xs text-[#6C757B] ml-1">件</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#DC2626]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[#DC2626]" />
              <span className="text-xs text-[#6C757B]">总金额</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono text-[#DC2626]">¥{totalAmount.toFixed(0)}<span className="text-xs text-[#6C757B] ml-1">元</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#059669]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-[#059669]" />
              <span className="text-xs text-[#6C757B]">总毛利</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono text-[#059669]">¥{totalGrossProfit.toFixed(0)}<span className="text-xs text-[#6C757B] ml-1">元</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#7C3AED]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Percent size={14} className="text-[#7C3AED]" />
              <span className="text-xs text-[#6C757B]">平均毛利率</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono text-[#7C3AED]">{recordsWithCost.length > 0 ? avgGrossMargin.toFixed(2) + '%' : '--'}</p>
          </div>
        </div>
      </div>

      {/* 添加/编辑记录表单 */}
      <section className="border border-[#E2E8F0] bg-white p-3 md:p-4 relative overflow-hidden rounded-xl shadow-sm">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#059669] via-[#0D9488] to-[#0284C7]" />
        <div className="flex items-center gap-2 mb-4 md:mb-5">
          <Package size={16} className="text-[#059669]" />
          <h3 className="text-sm md:text-base font-bold text-[#1A1A2E]">{editId ? '编辑发货记录' : '添加发货记录'}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <User size={12} /> 客户名字
            </label>
            <input
              type="text"
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder="客户名称"
              className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#059669] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <Tag size={12} /> 材料名称
            </label>
            <input
              type="text"
              value={material}
              onChange={e => setMaterial(e.target.value)}
              placeholder="如：PP、PE、ABS"
              className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#059669] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <Tag size={12} /> 牌号
            </label>
            <input
              type="text"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder="如：T30S、5000S"
              className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm focus:outline-none focus:border-[#059669] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <Calendar size={12} /> 发货日期
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm font-mono focus:outline-none focus:border-[#059669] transition-colors rounded-lg"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <Hash size={12} /> 数量
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="数量"
              min="0"
              step="1"
              className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 md:p-2.5 text-sm font-mono focus:outline-none focus:border-[#059669] transition-colors placeholder:text-[#6C757B]/50 rounded-lg"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <DollarSign size={12} /> 售价（元/kg）
            </label>
            <div className="flex items-center bg-gray-50 border border-[#E2E8F0] rounded-lg focus-within:border-[#059669] transition-colors">
              <span className="px-2.5 text-[#059669] text-sm font-mono select-none">¥</span>
              <input
                type="number"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
                placeholder="售价"
                min="0"
                step="0.01"
                className="flex-1 bg-transparent border-0 text-[#1A1A2E] p-2 md:p-2.5 text-sm font-mono focus:outline-none placeholder:text-[#6C757B]/50"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs text-[#6C757B] mb-1.5 font-medium">
              <DollarSign size={12} /> 成本价（元/kg）
            </label>
            <div className="flex items-center bg-gray-50 border border-[#E2E8F0] rounded-lg focus-within:border-[#059669] transition-colors">
              <span className="px-2.5 text-[#DC2626] text-sm font-mono select-none">¥</span>
              <input
                type="number"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                placeholder="成本价（选填）"
                min="0"
                step="0.01"
                className="flex-1 bg-transparent border-0 text-[#1A1A2E] p-2 md:p-2.5 text-sm font-mono focus:outline-none placeholder:text-[#6C757B]/50"
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">金额（自动计算）</label>
            <div className="w-full bg-[#059669]/5 border border-[#059669]/20 text-[#059669] p-2 md:p-2.5 text-sm font-mono rounded-lg text-right font-bold">
              ¥{previewAmount}
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">毛利（自动计算）</label>
            <div className={`w-full border p-2 md:p-2.5 text-sm font-mono rounded-lg text-right font-bold ${previewGrossProfit > 0 ? 'bg-[#059669]/5 border-[#059669]/20 text-[#059669]' : previewGrossProfit < 0 ? 'bg-[#DC2626]/5 border-[#DC2626]/20 text-[#DC2626]' : 'bg-gray-50 border-[#E2E8F0] text-[#6C757B]'}`}>
              ¥{previewGrossProfit.toFixed(2)}
            </div>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-[#6C757B] mb-1.5 block font-medium">毛利率（自动计算）</label>
            <div className={`w-full border p-2 md:p-2.5 text-sm font-mono rounded-lg text-right font-bold ${previewGrossMargin === '--' ? 'bg-gray-50 border-[#E2E8F0] text-[#6C757B]' : parseFloat(previewGrossMargin) > 0 ? 'bg-[#059669]/5 border-[#059669]/20 text-[#059669]' : parseFloat(previewGrossMargin) < 0 ? 'bg-[#DC2626]/5 border-[#DC2626]/20 text-[#DC2626]' : 'bg-gray-50 border-[#E2E8F0] text-[#6C757B]'}`}>
              {previewGrossMargin === '--' ? '--' : previewGrossMargin + '%'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleAdd}
            disabled={!customer.trim() || !date || !quantity || !unitPrice}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-2.5 font-bold text-sm rounded-lg transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0 bg-gradient-to-r from-[#059669] to-[#0D9488] text-white hover:shadow-lg hover:shadow-[#059669]/20"
          >
            <Plus size={16} /> {editId ? '保存修改' : '添加记录'}
          </button>
          <button onClick={() => recognizer.setShow(!recognizer.show)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${recognizer.show ? 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white shadow-[#F59E0B]/20' : 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white hover:shadow-[#F59E0B]/20'}`}
          >
            <Sparkles size={14} /> 智能识别
          </button>
          {editId && (
            <button
              onClick={resetForm}
              className="px-3 md:px-4 py-2 md:py-2.5 text-sm text-[#6C757B] border border-[#E2E8F0] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors rounded-lg"
            >
              取消编辑
            </button>
          )}
        </div>
      </section>

      <RecognizerPanel<RecognizedShippingItem>
        show={recognizer.show}
        onToggle={() => recognizer.setShow(!recognizer.show)}
        columns={[
          { key: 'customer', label: '客户' },
          { key: 'material', label: '材料' },
          { key: 'grade', label: '牌号' },
          { key: 'quantity', label: '数量', type: 'number' },
          { key: 'unitPrice', label: '售价', type: 'number' },
          { key: 'costPrice', label: '成本', type: 'number' },
        ]}
        onRecognizeText={recognizeShippingContent}
        onRecognizeFile={recognizeShippingContent}
        onApply={handleApplyShippingRecognized}
        applyLabel="填充首条到表单"
        applyHint="将第一条识别结果填入添加表单"
        textareaId="shipping-recognizer-text"
      />

      {/* 发货记录表格 */}
      <section className="border border-[#E2E8F0] bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#E2E8F0] flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Receipt size={16} className="text-[#1A1A2E]" />
            <h3 className="text-sm md:text-base font-bold text-[#1A1A2E]">发货记录</h3>
            {records.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-mono bg-[#059669]/5 text-[#059669] border border-[#059669]/20 rounded-full">
                {records.length}
              </span>
            )}
            {/* 选中提示 */}
            {selectedIds.size > 0 && (
              <span className="px-2.5 py-1 text-xs font-medium bg-[#0284C7]/5 text-[#0284C7] border border-[#0284C7]/20 rounded-full">
                已选 {selectedIds.size} 条 · {selectedQuantity}件 · ¥{selectedAmount.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {/* 批量删除 */}
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-lg"
              >
                <Trash2 size={12} /> <span className="hidden md:inline">删除选中</span> <span className="md:hidden">({selectedIds.size})</span><span className="hidden md:inline"> ({selectedIds.size})</span>
              </button>
            )}
            {/* 导出按钮 */}
            <div className="relative">
              <button
                onClick={() => setShowExport(!showExport)}
                disabled={records.length === 0}
                className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs border border-[#059669]/40 text-[#059669] hover:bg-[#059669]/5 transition-colors disabled:opacity-30 rounded-lg"
              >
                <Download size={12} /> <span className="hidden md:inline">{selectedIds.size > 0 ? `导出选中 (${selectedIds.size})` : '导出全部'}</span>
              </button>
              {showExport && records.length > 0 && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-10 py-2 min-w-[220px]">
                  <p className="px-3 py-1 text-xs text-[#6C757B] font-medium">
                    {selectedIds.size > 0 ? `导出选中的 ${selectedIds.size} 条记录` : '导出全部记录'}
                  </p>
                  {EXPORT_FORMATS.map(fmt => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.key}
                        onClick={() => handleExport(fmt.key)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1A1A2E] hover:bg-gray-50 transition-colors"
                      >
                        <Icon size={14} className="text-[#059669]" />
                        <span className="font-medium">{fmt.label}</span>
                        <span className="text-xs text-[#6C757B] ml-auto">{fmt.ext}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs border rounded-lg transition-all duration-200 ${
                saved
                  ? 'border-[#059669] text-[#059669] bg-[#059669]/5'
                  : 'border-[#059669]/40 text-[#059669] hover:bg-[#059669]/5'
              }`}
            >
              <Save size={12} /> <span className="hidden md:inline">{saved ? '已保存' : '保存'}</span>
            </button>
            <button
              onClick={handleClear}
              disabled={records.length === 0}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors disabled:opacity-30 rounded-lg"
            >
              <RotateCcw size={12} /> <span className="hidden md:inline">清空</span>
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            <Package size={48} className="empty-state-icon" />
            <p className="empty-state-title">暂无发货记录</p>
            <p className="empty-state-desc">点击上方"添加"按钮开始记录</p>
          </div>
        ) : (
          <>
            {/* 移动端卡片布局 */}
            <div className="md:hidden">
              {/* 全选栏 */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-[#E2E8F0]/60">
                <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-[#6C757B]">
                  {isAllSelected ? (
                    <CheckSquare size={14} className="text-[#059669]" />
                  ) : (
                    <Square size={14} className="text-[#6C757B]/40" />
                  )}
                  全选
                </button>
                <span className="text-xs text-[#6C757B]">合计: {totalQuantity}件 · ¥{totalAmount.toFixed(2)}</span>
              </div>
              {sortedRecords.map((record) => {
                const isSelected = selectedIds.has(record.id);
                const marginInfo = formatGrossMargin(record);
                return (
                  <div
                    key={record.id}
                    className={`p-3 border-b border-[#E2E8F0]/60 ${isSelected ? 'bg-[#059669]/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button onClick={() => toggleSelect(record.id)} className="p-0.5 mt-0.5 hover:scale-110 transition-transform flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[#059669]" />
                          ) : (
                            <Square size={16} className="text-[#6C757B]/40" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A2E] truncate">{record.customer}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {record.material && <span className="text-xs text-[#0284C7] bg-[#0284C7]/5 px-1.5 py-0.5 rounded">{record.material}</span>}
                            {record.grade && <span className="text-xs text-[#7C3AED] bg-[#7C3AED]/5 px-1.5 py-0.5 rounded">{record.grade}</span>}
                          </div>
                          <p className="text-xs text-[#6C757B] mt-0.5 font-mono">{record.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-[#6C757B] hover:text-[#0D9488] hover:bg-[#0D9488]/5 transition-colors rounded-md"
                          title="编辑"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-[#6C757B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-md"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 ml-6 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[#0284C7] font-mono">{record.quantity}件</span>
                        <span className="text-[#6C757B] font-mono">¥{record.unitPrice.toFixed(2)}/件</span>
                        {record.costPrice > 0 && <span className="text-[#DC2626]/70 font-mono">成本¥{record.costPrice.toFixed(2)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${marginInfo.color} ${record.costPrice > 0 ? 'bg-current/5' : ''}`}>{marginInfo.text}</span>
                        <span className="font-mono font-bold text-[#059669]">¥{record.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* 移动端合计栏 */}
              <div className="px-3 py-2.5 bg-gradient-to-r from-[#059669]/5 to-[#0D9488]/5 border-t-2 border-[#059669]/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1A1A2E]">合计 ({records.length}条)</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#0284C7]">{totalQuantity}件</span>
                    <span className="font-mono font-bold text-[#059669]">¥{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#6C757B]">总毛利</span>
                  <span className="font-mono font-bold text-[#059669]">¥{totalGrossProfit.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#6C757B]">平均毛利率</span>
                  <span className="font-mono font-bold text-[#7C3AED]">{recordsWithCost.length > 0 ? avgGrossMargin.toFixed(2) + '%' : '--'}</span>
                </div>
              </div>
            </div>

            {/* 桌面端表格布局 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
                <thead>
                  <tr className="bg-gray-50">
                    <th className="w-10 text-center text-[#6C757B] font-medium text-xs p-3 pl-4">
                      <button onClick={toggleSelectAll} className="p-0.5 hover:scale-110 transition-transform" title={isAllSelected ? '取消全选' : '全选'}>
                        {isAllSelected ? (
                          <CheckSquare size={16} className="text-[#059669]" />
                        ) : (
                          <Square size={16} className="text-[#6C757B]/40" />
                        )}
                      </button>
                    </th>
                    <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">客户名字</th>
                    <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">日期</th>
                    <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">材料名称</th>
                    <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">牌号</th>
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">数量</th>
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">售价</th>
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">成本价</th>
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">金额</th>
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">毛利</th>
                    <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">毛利率</th>
                    <th className="text-center text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider w-24">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record, index) => {
                    const isSelected = selectedIds.has(record.id);
                    const marginInfo = formatGrossMargin(record);
                    return (
                      <tr
                        key={record.id}
                        className={`border-b border-[#E2E8F0]/60 transition-colors ${
                          isSelected ? 'bg-[#059669]/5' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:bg-gray-50`}
                      >
                        <td className="p-3 pl-4 text-center">
                          <button onClick={() => toggleSelect(record.id)} className="p-0.5 hover:scale-110 transition-transform">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[#059669]" />
                            ) : (
                              <Square size={16} className="text-[#6C757B]/40" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-[#1A1A2E] font-medium">{record.customer}</td>
                        <td className="p-3 font-mono text-[#1A1A2E] text-sm">{record.date.slice(5)}</td>
                        <td className="p-3 text-[#0284C7] text-sm">{record.material || '--'}</td>
                        <td className="p-3 text-[#7C3AED] text-sm">{record.grade || '--'}</td>
                        <td className="p-3 text-right font-mono text-[#0284C7]">{record.quantity}</td>
                        <td className="p-3 text-right font-mono text-[#6C757B]">¥{record.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-[#DC2626]/70">¥{record.costPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-medium text-[#059669]">¥{record.amount.toFixed(2)}</td>
                        <td className={`p-3 text-right font-mono font-medium ${record.grossProfit > 0 ? 'text-[#059669]' : record.grossProfit < 0 ? 'text-[#DC2626]' : 'text-[#6C757B]'}`}>¥{record.grossProfit.toFixed(2)}</td>
                        <td className={`p-3 text-right font-mono font-medium ${marginInfo.color}`}>
                          {marginInfo.text}
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
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gradient-to-r from-[#059669]/5 to-[#0D9488]/5 border-t-2 border-[#059669]/20">
                    <td className="p-3 pl-4"></td>
                    <td className="p-3">
                      <span className="text-sm font-bold text-[#1A1A2E]">合计</span>
                      <span className="text-xs text-[#6C757B] ml-2">{records.length} 条记录</span>
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="p-3 text-right font-mono font-bold text-[#0284C7]">{totalQuantity}</td>
                    <td></td>
                    <td></td>
                    <td className="p-3 text-right font-mono text-xl font-bold text-[#059669]">¥{totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#059669]">¥{totalGrossProfit.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#7C3AED]">{recordsWithCost.length > 0 ? avgGrossMargin.toFixed(2) + '%' : '--'}</td>
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
