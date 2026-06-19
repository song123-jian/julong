﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useCallback, useRef } from 'react';
import { FileText, Building2, User, Calendar, Phone, AlertCircle, Clock, Package, ChevronDown, ChevronUp, Plus, Trash2, Save, RotateCcw, Download, Hash, FileSpreadsheet, FileJson, FileDown, Receipt, CheckSquare, Square, FileUp, X, Search, Info, CheckCircle, Sparkles, Upload, Loader2 } from 'lucide-react';
import { exportQuotationDocx, exportQuotationPdf, renderHtmlPagesToPdf, generateRecordPageHtml } from '../utils/quotationExport';
import { createExporter, type ExportColumn } from '../utils/exportFactory';
import { formatDateCN, generateId, downloadBlob } from '../lib/utils';
import { DEFAULTS } from '@/config/defaults';
import { recognizeContent, type RecognizedItem } from '../utils/contentRecognizer';
import { useRecognizer } from '../hooks/useRecognizer';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ========== 报价单部分 ==========
interface QuotationItem {
  id: string;
  material: string;
  grade: string;
  price: number;
  remark: string;
}

interface Quotation {
  id: string;
  title: string;
  company: string;
  sender: string;
  recipient: string;
  date: string;
  validFrom: string;
  validTo: string;
  moq: number;
  phone: string;
  note: string;
  items: QuotationItem[];
  greeting?: string;
  footerContact?: string;
  footerCompany?: string;
  closing?: string;
}

const QUOTATION_STORAGE_KEY = 'quotation_data';

const MOCK_QUOTATIONS: Quotation[] = [];

// ========== 报价记录部分 ==========
interface QuotationRecord {
  id: string;
  quotationId?: string;  // 关联的报价单 id（v7 新增：解决按客户名匹配串数据问题）
  customer: string;
  date: string;
  material: string;
  grade: string;
  quantity: number;
  unitPrice: number;
  status: '待确认' | '已确认' | '已取消';
  validFrom?: string;
  validTo?: string;
  moq?: number;
  note?: string;
  sender?: string;
  phone?: string;
  greeting?: string;
  footerContact?: string;
  footerCompany?: string;
  closing?: string;
}

const calcAmount = (quantity: number, unitPrice: number): number =>
  Math.round(quantity * unitPrice * 100) / 100;

const RECORDS_STORAGE_KEY = 'quotation_records';

const MOCK_RECORDS: QuotationRecord[] = [];

// 导出列配置
const QUOTATION_RECORD_COLUMNS: ExportColumn<QuotationRecord>[] = [
  { key: 'customer', label: '客户名字' },
  { key: 'date', label: '报价日期' },
  { key: 'material', label: '材料名称' },
  { key: 'grade', label: '牌号' },
  { key: 'quantity', label: '数量(KG)', isNumeric: true, align: 'right' },
  { key: 'unitPrice', label: '单价(元/kg)', isNumeric: true, align: 'right', format: v => `¥${Number(v).toFixed(2)}` },
  { key: 'status', label: '状态' },
];

// 导出工厂
const recordExporter = createExporter({ columns: QUOTATION_RECORD_COLUMNS, filename: '报价记录', title: '报价记录' });

async function exportRecordsDocx(records: QuotationRecord[], quotations: Quotation[]) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = await import('docx');
  const sections: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  };
  const font12 = { size: 24, font: '宋体' };
  const font10_5 = { size: 21, font: '宋体' };
  const font10_5_bold = { size: 21, font: '宋体', bold: true };

  // 按客户分组
  const grouped = new Map<string, QuotationRecord[]>();
  records.forEach(r => {
    const key = r.customer;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });
  let isFirst = true;

  grouped.forEach((groupRecords, customer) => {
    if (!isFirst) {
      sections.push(new Paragraph({ children: [], pageBreakBefore: true }));
    }
    isFirst = false;

    const firstRecord = groupRecords[0];
    const dateStr = formatDateCN(firstRecord.date);
    // 优先按 quotationId 精确匹配（v7 修复），其次按公司名/发件人
    const matchedQuotation = firstRecord.quotationId
      ? quotations.find(q => q.id === firstRecord.quotationId)
      : quotations.find(q => (q.company || q.sender) === customer);
    const validFrom = firstRecord.validFrom ? formatDateCN(firstRecord.validFrom) : (matchedQuotation ? formatDateCN(matchedQuotation.validFrom) : dateStr);
    const validTo = firstRecord.validTo ? formatDateCN(firstRecord.validTo) : (matchedQuotation ? formatDateCN(matchedQuotation.validTo) : dateStr);
    // v7 修复：MOQ 不再以 quantity 兜底，缺失则显示 N/A
    const moq = firstRecord.moq ?? matchedQuotation?.moq ?? null;
    const note = firstRecord.note ?? matchedQuotation?.note ?? '';
    const sender = firstRecord.sender || matchedQuotation?.sender || DEFAULTS.quotation.sender;
    const phone = firstRecord.phone || matchedQuotation?.phone || DEFAULTS.quotation.phone;
    const greeting = firstRecord.greeting || matchedQuotation?.greeting;
    const footerContact = firstRecord.footerContact || matchedQuotation?.footerContact;
    const footerCompany = firstRecord.footerCompany || matchedQuotation?.footerCompany;
    const closing = firstRecord.closing || matchedQuotation?.closing;

    // 传真标记行
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: ' ', ...font12 }),
        new TextRun({ text: '紧急', ...font12 }),
        new TextRun({ text: '\t', ...font12 }),
        new TextRun({ text: ' ', ...font12 }),
        new TextRun({ text: '请审阅', ...font12 }),
        new TextRun({ text: '\t', ...font12 }),
        new TextRun({ text: ' ', ...font12 }),
        new TextRun({ text: '请批注', ...font12 }),
        new TextRun({ text: '\t', ...font12 }),
        new TextRun({ text: ' ', ...font12 }),
        new TextRun({ text: '请答复', ...font12 }),
        new TextRun({ text: '\t', ...font12 }),
        new TextRun({ text: ' ', ...font12 }),
        new TextRun({ text: '请传阅', ...font12 }),
        new TextRun({ text: '\t', ...font12 }),
        new TextRun({ text: '★', ...font12 }),
        new TextRun({ text: '如不清晰烦请电告', ...font12, bold: true }),
      ],
    }));

    // 您好
    sections.push(new Paragraph({ children: [new TextRun({ text: '  您好', ...font12 }), new TextRun({ text: '！', ...font12, bold: true })] }));

    // 正文
    sections.push(new Paragraph({
      children: [new TextRun({ text: greeting || '首先感谢您的信任与配合！ 对于贵司所需的工程塑料材料，我公司当前报价（含税）为：', ...font12 })],
    }));

    sections.push(new Paragraph({ children: [] }));

    // 收件信息表
    const infoTable = new Table({
      alignment: AlignmentType.CENTER,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: `收件单位（Company）：${customer}`, ...font12 })] })] }),
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: `发件人(From)：${sender}`, ...font12 })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: '收件人（To）：', ...font12 })] })] }),
            new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: `日期(Date)：${dateStr}`, ...font12 })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: '传真号(Fax No)：', ...font12 })] })] }),
            new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: '页数(Page-Inc this one)：1', ...font12 })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: '主题(Subject)： 材料报价', ...font12 })] })] }),
            new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: '抄送（CC）：', ...font12 })] })] }),
          ],
        }),
      ],
    });
    sections.push(infoTable);
    sections.push(new Paragraph({ children: [] }));

    // 材料报价表
    const matRows = [
      new TableRow({
        children: ['材料名称', '牌号', '价格（元/kg）', '备注'].map(h =>
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, ...font10_5_bold })] })] })
        ),
      }),
      ...groupRecords.map(r => new TableRow({
        children: [
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.material, ...font10_5 })] })] }),
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.grade, ...font10_5 })] })] }),
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(r.unitPrice), ...font10_5 })] })] }),
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: r.status, ...font10_5 })] })] }),
        ],
      })),
    ];
    sections.push(new Table({ alignment: AlignmentType.CENTER, width: { size: 100, type: WidthType.PERCENTAGE }, rows: matRows }));

    sections.push(new Paragraph({ children: [] }));

    // 有效期
    sections.push(new Paragraph({ children: [new TextRun({ text: `有效期：${validFrom}-${validTo}`, ...font12 })] }));

    // MOQ和备注
    const totalAmt = groupRecords.reduce((s, r) => s + calcAmount(r.quantity, r.unitPrice), 0);
    const moqStr = moq != null ? `${moq}KG` : 'N/A';
    sections.push(new Paragraph({ children: [new TextRun({ text: `MOQ:${moqStr}备注：${note ? `(${note})` : `合计金额¥${totalAmt.toFixed(2)}`}`, ...font12 })] }));

    // 联系方式
    sections.push(new Paragraph({ children: [new TextRun({ text: footerContact || '如有疑问，敬请来电垂询。', ...font12 })] }));
    sections.push(new Paragraph({ children: [new TextRun({ text: `联系电话：${sender}${phone}`, ...font12 })] }));

    // 顺祝商祺
    (() => {
      const closingText = closing || '顺祝\n商祺！';
      const lines = closingText.split('\n');
      lines.forEach((line, idx) => {
        if (idx === 0) {
          sections.push(new Paragraph({ children: [new TextRun({ text: '                ' + line, ...font12 })] }));
        } else {
          sections.push(new Paragraph({ children: [new TextRun({ text: line, ...font12 })] }));
        }
      });
    })();

    // 公司名
    sections.push(new Paragraph({ children: [new TextRun({ text: '   ' + (footerCompany || '南京聚隆科技股份有限公司'), ...font12, bold: true })] }));

    // 日期
    sections.push(new Paragraph({ children: [new TextRun({ text: `                                                                    ${firstRecord.date.replace(/-/g, '/')}`, ...font12 })] }));
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 612775, bottom: 914400, left: 603250, right: 382270 } },
      },
      children: sections,
    }],
  });
  const blob = await Packer.toBlob(doc);
  await downloadBlob(blob, '报价记录.docx');
}

async function exportRecordsPdf(records: QuotationRecord[], quotations: Quotation[]) {

  // 按客户分组
  const grouped = new Map<string, QuotationRecord[]>();
  records.forEach(r => {
    const key = r.customer;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  const pagesHtml: string[] = [];

  grouped.forEach((groupRecords, customer) => {
    const firstRecord = groupRecords[0];
    const dateStr = formatDateCN(firstRecord.date);
    // 优先按 quotationId 精确匹配（v7 修复），其次按公司名/发件人
    const matchedQuotation = firstRecord.quotationId
      ? quotations.find(q => q.id === firstRecord.quotationId)
      : quotations.find(q => (q.company || q.sender) === customer);
    const validFrom = firstRecord.validFrom ? formatDateCN(firstRecord.validFrom) : (matchedQuotation ? formatDateCN(matchedQuotation.validFrom) : dateStr);
    const validTo = firstRecord.validTo ? formatDateCN(firstRecord.validTo) : (matchedQuotation ? formatDateCN(matchedQuotation.validTo) : dateStr);
    // v7 修复：MOQ 不再以 quantity 兜底，缺失则显示 N/A
    const moq = firstRecord.moq ?? matchedQuotation?.moq ?? null;
    const note = firstRecord.note ?? matchedQuotation?.note ?? '';
    const sender = firstRecord.sender || matchedQuotation?.sender || DEFAULTS.quotation.sender;
    const phone = firstRecord.phone || matchedQuotation?.phone || DEFAULTS.quotation.phone;
    const totalAmt = groupRecords.reduce((s, r) => s + calcAmount(r.quantity, r.unitPrice), 0);

    pagesHtml.push(generateRecordPageHtml(
      customer,
      groupRecords,
      dateStr,
      validFrom,
      validTo,
      moq,
      note,
      sender,
      phone,
      firstRecord.date,
      totalAmt,
      firstRecord.greeting || matchedQuotation?.greeting,
      firstRecord.footerContact || matchedQuotation?.footerContact,
      firstRecord.footerCompany || matchedQuotation?.footerCompany,
      firstRecord.closing || matchedQuotation?.closing
    ));
  });

  await renderHtmlPagesToPdf(pagesHtml, '报价记录.pdf');
}


const EXPORT_FORMATS = [
  { key: 'pdf', label: 'PDF', icon: FileText, ext: '.pdf' },
  { key: 'docx', label: 'Word', icon: FileUp, ext: '.docx' },
  { key: 'csv', label: 'CSV', icon: FileText, ext: '.csv' },
  { key: 'tsv', label: 'TSV', icon: FileDown, ext: '.tsv' },
  { key: 'json', label: 'JSON', icon: FileJson, ext: '.json' },
  { key: 'html', label: 'HTML', icon: FileSpreadsheet, ext: '.html' },
  { key: 'xml', label: 'XML', icon: FileText, ext: '.xml' },
  { key: 'md', label: 'Markdown', icon: FileText, ext: '.md' },
];

const STATUS_CONFIG = {
  '待确认': { color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  '已确认': { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  '已取消': { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
};

// 同步报价单到发货记录的辅助函数
interface ShippingRecordForSync {
  id: string;
  customer: string;
  date: string;
  material: string;
  grade: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  amount: number;
  grossProfit: number;
  grossMargin: number;
}

function syncToShippingRecords(q: Quotation) {
  const STORAGE_KEY = 'shipping_records';
  try {
    // v8 修复：先触发事件让 ShippingRecords 页面回写最新 state 到 localStorage
    // 避免 ShippingRecords 页面有未保存的 state 被覆盖
    const data = localStorage.getItem(STORAGE_KEY);
    const existing = data ? (Array.isArray(JSON.parse(data)) ? JSON.parse(data) : []) : [];

    const newItems = q.items
      .filter(item => item.material && item.grade && item.price > 0)
      .map(item => {
        const amount = q.moq * item.price;
        const grossProfit = 0; // 售价未知时毛利为0
        const grossMargin = 0;
        return {
          id: `qs_${item.id}`,
          customer: q.company || q.sender || '-',
          date: q.date,
          material: item.material,
          grade: item.grade,
          quantity: q.moq,
          unitPrice: item.price,
          costPrice: 0, // 成本价需要手动填写
          amount,
          grossProfit,
          grossMargin,
        };
      });

    const updated = [...existing.filter(r => !q.items.some(i => r.id === `qs_${i.id}`)), ...newItems];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shipping-records-updated'));
  } catch (e) {
    console.error('同步发货记录失败:', e);
  }
}

function removeFromShippingRecords(q: Quotation) {
  const STORAGE_KEY = 'shipping_records';
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const existing: ShippingRecordForSync[] = data ? (Array.isArray(JSON.parse(data)) ? JSON.parse(data) : []) : [];
    const updated = existing.filter(r => !q.items.some(i => r.id === `qs_${i.id}`));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shipping-records-updated'));
  } catch (e) {
    console.error('删除发货记录失败:', e);
  }
}

export default function Quotation() {
  // v7 新增：toast 状态
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    details: string[];
    durationMs?: number;
  } | null>(null);

  // v7 新增：删除报价单的二次确认弹窗
  const [deleteConfirm, setDeleteConfirm] = useState<{
    quotationId: string;
    quotationTitle: string;
    relatedCount: number;
  } | null>(null);
  // v7 新增：用户偏好（"同时删除" / "仅删除报价单"），存到 localStorage 跨会话记忆
  const DELETE_PREF_KEY = 'quotation_delete_cascade_pref';
  const getDeletePreference = (): 'cascade' | 'keep' | null => {
    try {
      const v = localStorage.getItem(DELETE_PREF_KEY);
      if (v === 'cascade' || v === 'keep') return v;
    } catch { /* ignore */ }
    return null;
  };

  const showToast = useCallback((t: NonNullable<typeof toast>) => {
    setToast(t);
    if (t.durationMs !== 0) {
      setTimeout(() => setToast(null), t.durationMs ?? 6000);
    }
  }, []);

  // ========== 报价单状态 ==========
  const [quotations, setQuotations] = useLocalStorage<Quotation[]>(QUOTATION_STORAGE_KEY, () => {
    const raw = localStorage.getItem(QUOTATION_STORAGE_KEY);
    if (raw === null) return MOCK_QUOTATIONS;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return MOCK_QUOTATIONS;
      const valid = parsed.filter((q): q is Quotation =>
        q != null && typeof q === 'object' && typeof q.title === 'string' && Array.isArray(q.items)
      );
      return valid;
    } catch {
      return MOCK_QUOTATIONS;
    }
  });
  const [expandedId, setExpandedId] = useState<string>(quotations[0]?.id || '');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Quotation | null>(null);

  // 智能识别
  const recognizer = useRecognizer<RecognizedItem>();
  const textRef = useRef<HTMLTextAreaElement>(null);

  // ========== 报价记录状态 ==========
  const [records, setRecords] = useLocalStorage<QuotationRecord[]>(RECORDS_STORAGE_KEY, () => {
    const raw = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (raw === null) return MOCK_RECORDS;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return MOCK_RECORDS;
      const valid = parsed.filter((r): r is QuotationRecord =>
        r != null && typeof r === 'object' && typeof r.customer === 'string' && typeof r.quantity === 'number'
      );
      return valid;
    } catch {
      return MOCK_RECORDS;
    }
  });
  interface RecordForm {
    customer: string;
    date: string;
    material: string;
    grade: string;
    quantity: string;
    unitPrice: string;
    status: QuotationRecord['status'];
  }
  const defaultRForm: RecordForm = {
    customer: '', date: new Date().toISOString().slice(0, 10),
    material: '', grade: '', quantity: '', unitPrice: '', status: '待确认',
  };
  const [rForm, setRForm] = useState<RecordForm>(defaultRForm);
  const [rEditId, setREditId] = useState<string | null>(null);
  const [rFormError, setRFormError] = useState('');
  const [rSaved, setRSaved] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [rSearch, setRSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advDateFrom, setAdvDateFrom] = useState('');
  const [advDateTo, setAdvDateTo] = useState('');
  const [advAmountMin, setAdvAmountMin] = useState('');
  const [advAmountMax, setAdvAmountMax] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ========== 报价单方法 ==========
  const handleQClear = () => {
    if (quotations.length === 0) return;
    // 删除所有报价单关联的发货记录
    quotations.forEach(q => removeFromShippingRecords(q));
    // 只清空报价单，不清空报价记录
    setQuotations([]);
    setExpandedId('');
    setEditId(null);
    setForm(null);
  };
  const handleQEdit = (q: Quotation) => { setEditId(q.id); setForm({ ...q, items: q.items.map(i => ({ ...i })) }); };
  const handleQCancelEdit = () => { setEditId(null); setForm(null); recognizer.reset(); };
  const handleQSaveEdit = () => {
    if (!form) return;

    // 验证：报价单标题不能为空
    if (!form.title.trim()) {
      showToast({ type: 'error', title: '保存失败', details: ['报价单标题不能为空'] });
      return;
    }

    const updatedQuotations = quotations.map(q => q.id === editId ? form : q);
    setQuotations(updatedQuotations);

    // 同步报价单材料到报价记录
    // v7 修复：使用 startsWith 过滤该报价单的所有旧 auto 记录（之前 filter bug 不会过滤"被删除的 item"）
    const validItems = form.items.filter(item => item.material && item.grade && item.price > 0);

    if (validItems.length === 0) {
      // 没有有效材料：清掉该报价单的历史记录 + 提示
      setRecords(prev => prev.filter(r => !r.id.startsWith(`auto-${form.id}-`)));
      showToast({
        type: 'info',
        title: '报价单已保存',
        details: [
          `报价单 "${form.title}" 已保存`,
          '⚠️ 该报价单暂无有效材料，未生成报价记录',
          '提示：在材料表中至少添加 1 行（材料名 + 牌号 + 价格）',
        ],
        durationMs: 0,
      });
    } else {
      const newRecords = validItems.map(item => {
        const recordId = `auto-${form.id}-${item.id}`;
        const existingRecord = records.find(r => r.id === recordId);
        return {
          id: recordId,
          quotationId: form.id,
          customer: form.company || form.sender || '-',
          date: form.date,
          material: item.material,
          grade: item.grade,
          quantity: form.moq,
          unitPrice: item.price,
          status: existingRecord ? existingRecord.status : ('待确认' as const),
          validFrom: form.validFrom,
          validTo: form.validTo,
          moq: form.moq,
          note: form.note,
          sender: form.sender,
          phone: form.phone,
          greeting: form.greeting,
          footerContact: form.footerContact,
          footerCompany: form.footerCompany,
          closing: form.closing,
        };
      });
      // 关键修复：先过滤掉"该报价单的所有旧 auto 记录"（包括被删除 item 的残留），再追加新记录
      setRecords(prev => [
        ...prev.filter(r => !r.id.startsWith(`auto-${form.id}-`)),
        ...newRecords,
      ]);

      // 同步报价单材料到发货记录
      syncToShippingRecords(form);

      showToast({
        type: 'success',
        title: '保存并同步到报价记录',
        details: [
          `报价单 "${form.title}" 已保存`,
          `✅ 已生成 ${newRecords.length} 条报价记录`,
          '提示：切换到"报价记录"页查看',
        ],
        durationMs: 5000,
      });
    }

    setEditId(null);
    setForm(null);
  };

  // v7 新增：单独"同步到报价记录"操作（不修改报价单本身）
  const handleQSyncToRecords = () => {
    if (!form) return;
    const validItems = form.items.filter(item => item.material && item.grade && item.price > 0);
    if (validItems.length === 0) {
      showToast({
        type: 'warning',
        title: '暂无可同步材料',
        details: [
          '当前编辑的报价单没有有效材料',
          '请在材料表中至少添加 1 行（材料名 + 牌号 + 价格）',
        ],
        durationMs: 5000,
      });
      return;
    }
    const newRecords = validItems.map(item => {
      const recordId = `auto-${form.id}-${item.id}`;
      const existingRecord = records.find(r => r.id === recordId);
      return {
        id: recordId,
        quotationId: form.id,
        customer: form.company || form.sender || '-',
        date: form.date,
        material: item.material,
        grade: item.grade,
        quantity: form.moq,
        unitPrice: item.price,
        status: existingRecord ? existingRecord.status : ('待确认' as const),
        validFrom: form.validFrom,
        validTo: form.validTo,
        moq: form.moq,
        note: form.note,
        sender: form.sender,
        phone: form.phone,
        greeting: form.greeting,
        footerContact: form.footerContact,
        footerCompany: form.footerCompany,
        closing: form.closing,
      };
    });
    setRecords(prev => [
      ...prev.filter(r => !r.id.startsWith(`auto-${form.id}-`)),
      ...newRecords,
    ]);
    showToast({
      type: 'success',
      title: '已同步到报价记录',
      details: [
        `✅ 同步 ${newRecords.length} 条记录到"报价记录"页`,
        '报价单内容未变',
      ],
      durationMs: 5000,
    });
  };

  // v7 修复：删除报价单不再无条件级联，按用户选择决定是否保留关联记录
  const handleQDelete = (id: string) => {
    const q = quotations.find(q => q.id === id);
    if (!q) return;
    // 统计关联的报价记录数（按 id 前缀 auto-{qId}- 匹配）
    const relatedCount = records.filter(r => r.id.startsWith(`auto-${q.id}-`)).length;
    const pref = getDeletePreference();

    // 无关联记录：直接删除，不弹窗
    if (relatedCount === 0) {
      performQDelete(id, q, false);
      return;
    }

    // 有关联记录：优先按用户偏好
    if (pref === 'keep') {
      performQDelete(id, q, false);
      return;
    }
    if (pref === 'cascade') {
      performQDelete(id, q, true);
      return;
    }
    // 首次/无偏好：弹窗让用户选
    setDeleteConfirm({ quotationId: id, quotationTitle: q.title, relatedCount });
  };

  // 实际执行删除（cascade 控制是否同时删记录）
  const performQDelete = (id: string, q: Quotation, cascade: boolean) => {
    if (cascade) {
      setRecords(prev => prev.filter(r => !r.id.startsWith(`auto-${q.id}-`)));
    } else {
      // 保留记录，但清除 quotationId 与报价单相关字段（标记为 orphan）
      setRecords(prev => prev.map(r => r.id.startsWith(`auto-${q.id}-`)
        ? { ...r, quotationId: undefined, sender: undefined, phone: undefined, greeting: undefined, footerContact: undefined, footerCompany: undefined, closing: undefined }
        : r));
    }
    // 删除该报价单关联的发货记录
    removeFromShippingRecords(q);
    setQuotations(prev => prev.filter(q => q.id !== id));
    if (expandedId === id) setExpandedId('');
    showToast({
      type: cascade ? 'warning' : 'info',
      title: cascade ? '报价单及记录已删除' : '报价单已删除，记录已保留',
      details: cascade
        ? [`已删除 ${q.title} 及其 ${records.filter(r => r.id.startsWith(`auto-${q.id}-`)).length} 条关联记录`]
        : [`已删除 ${q.title}，关联的报价记录已保留为"原报价单已删除"状态`],
    });
  };

  // 确认弹窗的两个按钮：仅删报价单 / 同时删记录
  const confirmDelete = (cascade: boolean, remember: boolean) => {
    if (!deleteConfirm) return;
    const q = quotations.find(x => x.id === deleteConfirm.quotationId);
    if (q) performQDelete(q.id, q, cascade);
    if (remember) {
      try { localStorage.setItem(DELETE_PREF_KEY, cascade ? 'cascade' : 'keep'); } catch { /* ignore */ }
    }
    setDeleteConfirm(null);
  };
  const handleAddQuotation = () => {
    const newQ: Quotation = { id: generateId(), title: '新报价单', company: '', sender: DEFAULTS.quotation.sender, recipient: '', date: new Date().toISOString().slice(0, 10), validFrom: new Date().toISOString().slice(0, 10), validTo: '', moq: DEFAULTS.quotation.moq, phone: DEFAULTS.quotation.phone, note: '', items: [{ id: generateId(), material: '', grade: '', price: 0, remark: '' }] };
    setQuotations(prev => [...prev, newQ]); setExpandedId(newQ.id); handleQEdit(newQ);
  };
  const handleAddItem = () => { if (!form) return; setForm({ ...form, items: [...form.items, { id: generateId(), material: '', grade: '', price: 0, remark: '' }] }); };
  const handleRemoveItem = (itemId: string) => { if (!form) return; setForm({ ...form, items: form.items.filter(i => i.id !== itemId) }); };
  const handleUpdateItem = (itemId: string, field: keyof QuotationItem, value: string | number) => { if (!form) return; setForm({ ...form, items: form.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }); };
  const toggleExpand = (id: string) => { setExpandedId(expandedId === id ? '' : id); };

  // 智能识别处理 - 使用 useRecognizer hook

  const handleApplyRecognized = (replace: boolean) => {
    if (recognizer.items.length === 0) return;
    const newItems = recognizer.items.map(item => ({
      id: generateId(),
      material: item.material,
      grade: item.grade,
      price: item.price,
      remark: item.remark,
    }));

    // 如果正在编辑，直接填充到 form
    if (editId && form) {
      setForm({
        ...form,
        items: replace ? newItems : [...form.items, ...newItems],
      });
    } else {
      // 没有在编辑，找到当前展开的报价单或第一个，进入编辑并填充
      const targetQ = expandedId ? quotations.find(q => q.id === expandedId) : quotations[0];
      if (targetQ) {
        const updatedQ = {
          ...targetQ,
          items: replace ? newItems : [...targetQ.items, ...newItems],
        };
        setForm(updatedQ);
        setEditId(targetQ.id);
        setExpandedId(targetQ.id);
      } else {
        // 没有报价单，自动新建一个并填充
        const newQ: Quotation = {
          id: generateId(),
          title: '新报价单',
          company: '',
          sender: DEFAULTS.quotation.sender,
          recipient: '',
          date: new Date().toISOString().slice(0, 10),
          validFrom: new Date().toISOString().slice(0, 10),
          validTo: '',
          moq: DEFAULTS.quotation.moq,
          phone: DEFAULTS.quotation.phone,
          note: '',
          items: newItems,
        };
        setQuotations(prev => [...prev, newQ]);
        setForm(newQ);
        setEditId(newQ.id);
        setExpandedId(newQ.id);
      }
    }
    recognizer.reset();
  };

  const handleExportQuotation = async (q: Quotation, format: string) => {
    const exportData = {
      title: q.title,
      company: q.company,
      sender: q.sender,
      recipient: q.recipient,
      date: q.date,
      validFrom: q.validFrom,
      validTo: q.validTo,
      moq: q.moq,
      phone: q.phone,
      note: q.note,
      items: q.items.map(i => ({ material: i.material, grade: i.grade, price: i.price, remark: i.remark })),
      greeting: q.greeting,
      footerContact: q.footerContact,
      footerCompany: q.footerCompany,
      closing: q.closing,
    };
    if (format === 'docx') {
      await exportQuotationDocx(exportData);
    } else if (format === 'pdf') {
      await exportQuotationPdf(exportData);
    }
  };

  // ========== 报价记录方法 ==========
  const resetRForm = () => { setRForm(defaultRForm); setREditId(null); };

  const handleRAdd = () => {
    const { customer: c, date: d, material: m, grade: g, quantity: q, unitPrice: p, status: s } = rForm;
    setRFormError('');
    if (!c.trim()) { setRFormError('请输入客户名称'); return; }
    if (!d) { setRFormError('请选择日期'); return; }
    if (!m.trim()) { setRFormError('请输入材料名称'); return; }
    if (!g.trim()) { setRFormError('请输入牌号'); return; }
    if (!q || isNaN(parseFloat(q)) || parseFloat(q) <= 0) { setRFormError('数量必须大于0'); return; }
    if (!p || isNaN(parseFloat(p)) || parseFloat(p) <= 0) { setRFormError('单价必须大于0'); return; }
    const qty = parseFloat(q); const price = parseFloat(p);
    if (rEditId) {
      setRecords(prev => prev.map(r => r.id === rEditId ? { ...r, customer: c.trim(), date: d, material: m.trim(), grade: g.trim(), quantity: qty, unitPrice: price, status: s } : r));
      setREditId(null);
    } else {
      setRecords(prev => [...prev, { id: `manual-${generateId()}`, customer: c.trim(), date: d, material: m.trim(), grade: g.trim(), quantity: qty, unitPrice: price, status: s }]);
    }
    resetRForm();
  };

  const handleREdit = (record: QuotationRecord) => {
    setREditId(record.id);
    setRForm({
      customer: record.customer, date: record.date,
      material: record.material, grade: record.grade,
      quantity: record.quantity.toString(), unitPrice: record.unitPrice.toString(),
      status: record.status,
    });
  };
  const handleRDelete = (id: string) => { setRecords(prev => prev.filter(r => r.id !== id)); setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; }); if (rEditId === id) resetRForm(); };
  const handleRClear = () => { if (records.length === 0) return; setRecords([]); setSelectedIds(new Set()); resetRForm(); };
  const handleRSave = () => {
    // 同步所有报价单到发货记录
    quotations.forEach(q => syncToShippingRecords(q));
    // 清空报价单
    setQuotations([]);
    setExpandedId('');
    setEditId(null);
    setForm(null);
    setRSaved(true);
    setTimeout(() => setRSaved(false), 2000);
  };

  const filteredRecords = records.filter(r => {
    // 关键词搜索（支持客户、材料、牌号、状态、sender、phone、note）
    if (rSearch.trim()) {
      const kw = rSearch.trim().toLowerCase();
      const inBasic = r.customer.toLowerCase().includes(kw)
        || r.material.toLowerCase().includes(kw)
        || r.grade.toLowerCase().includes(kw)
        || r.status.includes(kw)
        || (r.sender || '').toLowerCase().includes(kw)
        || (r.phone || '').toLowerCase().includes(kw)
        || (r.note || '').toLowerCase().includes(kw);
      if (!inBasic) return false;
    }
    // 高级搜索：日期区间
    if (advDateFrom && r.date < advDateFrom) return false;
    if (advDateTo && r.date > advDateTo) return false;
    // 高级搜索：金额区间
    const amt = calcAmount(r.quantity, r.unitPrice);
    if (advAmountMin !== '' && !isNaN(parseFloat(advAmountMin)) && amt < parseFloat(advAmountMin)) return false;
    if (advAmountMax !== '' && !isNaN(parseFloat(advAmountMax)) && amt > parseFloat(advAmountMax)) return false;
    return true;
  });
  const sortedRecords = [...filteredRecords].sort((a, b) => b.date.localeCompare(a.date));
  const toggleSelect = (id: string) => { setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => { if (selectedIds.size === sortedRecords.length) setSelectedIds(new Set()); else setSelectedIds(new Set(sortedRecords.map(r => r.id))); };
  const isAllSelected = sortedRecords.length > 0 && selectedIds.size === sortedRecords.length;
  const handleBatchDelete = () => { if (selectedIds.size === 0) return; setRecords(prev => prev.filter(r => !selectedIds.has(r.id))); setSelectedIds(new Set()); };

  const handleExport = async (format: string) => {
    const exportData = selectedIds.size > 0 ? filteredRecords.filter(r => selectedIds.has(r.id)) : filteredRecords;
    if (exportData.length === 0) return;
    switch (format) {
      case 'pdf': await exportRecordsPdf(exportData, quotations); break;
      case 'docx': await exportRecordsDocx(exportData, quotations); break;
      case 'csv': await recordExporter.csv(exportData); break;
      case 'tsv': await recordExporter.tsv(exportData); break;
      case 'json': await recordExporter.json(exportData); break;
      case 'html': await recordExporter.html(exportData); break;
      case 'xml': await recordExporter.xml(exportData); break;
      case 'md': await recordExporter.md(exportData); break;
    }
    setShowExport(false);
  };

  // 统计
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = records.reduce((sum, r) => sum + calcAmount(r.quantity, r.unitPrice), 0);
  const customerCount = new Set(records.map(r => r.customer)).size;
  const pendingCount = records.filter(r => r.status === '待确认').length;
  const confirmedCount = records.filter(r => r.status === '已确认').length;
  const selectedRecords = records.filter(r => selectedIds.has(r.id));
  const selectedQuantity = selectedRecords.reduce((sum, r) => sum + r.quantity, 0);
  const selectedAmount = selectedRecords.reduce((sum, r) => sum + calcAmount(r.quantity, r.unitPrice), 0);
  const previewAmount = rForm.quantity && rForm.unitPrice ? ((parseFloat(rForm.quantity) || 0) * (parseFloat(rForm.unitPrice) || 0)).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#E11D48] rounded-lg shadow-md">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">报价单参考</h2>
          <p className="text-xs text-[#6C757B] mt-0.5">管理供应商材料报价单，记录报价信息</p>
        </div>
      </div>

      {/* ==================== 统计卡片 ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card-hover border border-[#E2E8F0] bg-white p-4 relative overflow-hidden rounded-xl shadow-sm min-w-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#7C3AED]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2"><Receipt size={14} className="text-[#7C3AED]" /><span className="text-xs text-[#6C757B]">总记录</span></div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#7C3AED] truncate">{records.length}<span className="text-xs text-[#6C757B] ml-1">条</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-4 relative overflow-hidden rounded-xl shadow-sm min-w-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#D97706]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2"><Building2 size={14} className="text-[#D97706]" /><span className="text-xs text-[#6C757B]">客户数</span></div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#D97706] truncate">{customerCount}<span className="text-xs text-[#6C757B] ml-1">个</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-4 relative overflow-hidden rounded-xl shadow-sm min-w-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#0284C7]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2"><Hash size={14} className="text-[#0284C7]" /><span className="text-xs text-[#6C757B]">总数量</span></div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#0284C7] truncate">{totalQuantity}<span className="text-xs text-[#6C757B] ml-1">KG</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-4 relative overflow-hidden rounded-xl shadow-sm min-w-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#D97706]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2"><span className="w-3.5 h-3.5 rounded-full bg-[#D97706]/20 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /></span><span className="text-xs text-[#6C757B]">待确认</span></div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#D97706] truncate">{pendingCount}<span className="text-xs text-[#6C757B] ml-1">条</span></p>
          </div>
        </div>
        <div className="card-hover border border-[#E2E8F0] bg-white p-4 relative overflow-hidden rounded-xl shadow-sm min-w-0">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#059669]/5 rounded-bl-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2"><span className="w-3.5 h-3.5 rounded-full bg-[#059669]/20 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-[#059669]" /></span><span className="text-xs text-[#6C757B]">已确认</span></div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#059669] truncate">{confirmedCount}<span className="text-xs text-[#6C757B] ml-1">条</span></p>
          </div>
        </div>
      </div>

      {/* ==================== 报价单区域 ==================== */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <button onClick={handleAddQuotation}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-[#7C3AED] to-[#E11D48] text-white rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:shadow-[#7C3AED]/20"
        >
          新增报价单
        </button>
        <button onClick={() => recognizer.setShow(!recognizer.show)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${recognizer.show ? 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white shadow-[#F59E0B]/20' : 'bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white hover:shadow-[#F59E0B]/20'}`}
        >
          <Sparkles size={14} /> 智能识别
        </button>

        <button onClick={handleRSave}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-all duration-200 ${rSaved ? 'border-[#059669] text-[#059669] bg-[#059669]/5' : 'border-[#059669]/40 text-[#059669] hover:bg-[#059669]/5'}`}
        >
          <Save size={12} /> {rSaved ? '已保存' : '保存'}
        </button>
        <button onClick={handleQClear}
          disabled={quotations.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors disabled:opacity-30 rounded-lg"
        >
          <RotateCcw size={12} /> 清空报价单
        </button>
      </div>

      {/* 智能识别面板 */}
      {recognizer.show && (
        <div className="border border-[#F59E0B]/30 rounded-xl bg-[#FFFBEB]/50 p-3 md:p-4 shadow-sm max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-[#92400E] flex items-center gap-1.5"><Sparkles size={14} /> 智能识别 - 粘贴文本或上传文件</h4>
            <button onClick={() => recognizer.reset()} className="p-1 text-[#6C757B] hover:text-[#DC2626] transition-colors"><X size={16} /></button>
          </div>
          {/* 文本输入区 */}
          <textarea
            ref={textRef}
            id="recognizer-text"
            placeholder="粘贴报价内容，如：&#10;PP-TD20  PM4-R04  8.50&#10;PA66-GF30  FR502  12.5元/kg&#10;支持从微信/邮件/文档复制的内容"
            rows={4}
            className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#F59E0B] rounded-lg resize-none mb-3"
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); recognizer.recognizeText((e.target as HTMLTextAreaElement).value, recognizeContent); } }}
          />
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => { if (textRef.current) recognizer.recognizeText(textRef.current.value, recognizeContent); }} disabled={recognizer.status === 'recognizing' || recognizer.status === 'loading'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Sparkles size={12} /> 识别文本</button>
            <span className="text-[11px] text-[#6C757B]">Ctrl+Enter 快捷识别</span>
            <div className="flex-1" />
            <input ref={recognizer.fileRef} type="file" accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.csv" multiple className="hidden" onChange={e => recognizer.recognizeFile(e.target.files, (file, onProgress) => recognizeContent(file, undefined, onProgress))} />
            <button onClick={() => recognizer.fileRef.current?.click()} disabled={recognizer.status === 'loading'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/5 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"><Upload size={12} /> 上传文件</button>
            <span className="text-[11px] text-[#6C757B]">支持图片/PDF/Word/Excel</span>
          </div>
          {/* 进度条 */}
          {(recognizer.status === 'loading' || recognizer.status === 'recognizing') && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-[#92400E] mb-1">
                <Loader2 size={12} className="animate-spin" />
                {recognizer.status === 'loading' ? '正在读取文件...' : `正在识别... ${recognizer.progress}%`}
              </div>
              <div className="w-full bg-[#FDE68A]/30 rounded-full h-1.5">
                <div className="bg-[#F59E0B] h-1.5 rounded-full transition-all duration-300" style={{ width: `${recognizer.status === 'loading' ? 30 : recognizer.progress}%` }} />
              </div>
            </div>
          )}
          {/* 错误提示 */}
          {recognizer.error && (
            <div className="mb-3 p-2 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg text-xs text-[#DC2626]">{recognizer.error}</div>
          )}
          {/* 识别结果预览 */}
          {recognizer.items.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-[#6C757B] mb-2">识别结果（{recognizer.items.length}条，可编辑修正）</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead><tr className="bg-[#FEF3C7]">
                    <th className="text-left text-[#92400E] font-medium text-xs p-2">材料名称</th>
                    <th className="text-left text-[#92400E] font-medium text-xs p-2">牌号</th>
                    <th className="text-right text-[#92400E] font-medium text-xs p-2">价格</th>
                    <th className="text-left text-[#92400E] font-medium text-xs p-2">备注</th>
                    <th className="w-10 text-center text-[#92400E] font-medium text-xs p-2"></th>
                  </tr></thead>
                  <tbody>
                    {recognizer.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#E2E8F0]/60">
                        <td className="p-2"><input value={item.material} onChange={e => recognizer.updateItem(idx, { material: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1 text-xs focus:outline-none focus:border-[#F59E0B] rounded" /></td>
                        <td className="p-2"><input value={item.grade} onChange={e => recognizer.updateItem(idx, { grade: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1 text-xs font-mono focus:outline-none focus:border-[#F59E0B] rounded" /></td>
                        <td className="p-2"><input type="number" value={item.price || ''} onChange={e => recognizer.updateItem(idx, { price: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1 text-xs font-mono text-right focus:outline-none focus:border-[#F59E0B] rounded" /></td>
                        <td className="p-2"><input value={item.remark} onChange={e => recognizer.updateItem(idx, { remark: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1 text-xs focus:outline-none focus:border-[#F59E0B] rounded" /></td>
                        <td className="p-2 text-center"><button onClick={() => recognizer.removeItem(idx)} className="p-1 text-[#6C757B] hover:text-[#DC2626] transition-colors"><Trash2 size={12} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => handleApplyRecognized(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"><Plus size={12} /> 追加填充</button>
                <button onClick={() => handleApplyRecognized(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-lg"><RotateCcw size={12} /> 替换填充</button>
                <span className="text-[11px] text-[#6C757B]">追加=保留已有材料 | 替换=清空后填入</span>
              </div>
            </div>
          )}
          {recognizer.status === 'done' && recognizer.items.length === 0 && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-[#6C757B] text-center">未识别到有效材料信息，请检查内容格式或手动输入</div>
          )}
        </div>
      )}

      {quotations.length === 0 ? (
        <div className="border border-[#E2E8F0] bg-white p-16 text-center rounded-xl shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-50 border border-[#E2E8F0] rounded-full">
            <FileText size={28} className="text-[#6C757B]/50" />
          </div>
          <p className="empty-state-title">暂无报价单</p>
          <p className="empty-state-desc">点击"新增报价单"添加</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotations.map(q => {
            const isExpanded = expandedId === q.id;
            const isEditing = editId === q.id;
            const displayQ = isEditing && form ? form : q;
            return (
              <section key={q.id} className="border border-[#E2E8F0] bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-3 md:p-4 cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => !isEditing && toggleExpand(q.id)}>
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-[#7C3AED]/10 rounded-lg"><FileText size={16} className="text-[#7C3AED]" /></div>
                    <div className="min-w-0">
                      <h3 className="text-sm md:text-base font-bold text-[#1A1A2E] truncate">{displayQ.title}</h3>
                      <p className="text-xs text-[#6C757B] truncate">{displayQ.company} · {displayQ.date} · {displayQ.items.length}种材料</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {!isEditing && (
                      <>
                        <button onClick={() => handleExportQuotation(q, 'docx')} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#0284C7] hover:bg-[#0284C7]/5 transition-colors rounded-md text-xs" title="导出Word"><FileUp size={14} /> Word</button>
                        <button onClick={() => handleExportQuotation(q, 'pdf')} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-md text-xs" title="导出PDF"><FileText size={14} /> PDF</button>
                        <button onClick={() => handleQEdit(q)} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#0D9488] hover:bg-[#0D9488]/5 transition-colors rounded-md text-xs" title="编辑">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> 编辑
                        </button>
                        <button onClick={() => handleQDelete(q.id)} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-md text-xs" title="删除"><Trash2 size={14} /> 删除</button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-[#6C757B]" /> : <ChevronDown size={16} className="text-[#6C757B]" />}
                  </div>
                  <div className="md:hidden" onClick={e => e.stopPropagation()}>
                    {isExpanded ? <ChevronUp size={16} className="text-[#6C757B]" /> : <ChevronDown size={16} className="text-[#6C757B]" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-[#E2E8F0]">
                    {/* 移动端操作按钮 */}
                    {!isEditing && (
                      <div className="md:hidden flex flex-wrap items-center gap-2 px-3 py-2 bg-gray-50/80 border-b border-[#E2E8F0]">
                        <button onClick={() => handleExportQuotation(q, 'docx')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#0284C7] bg-[#0284C7]/5 rounded-md"><FileUp size={12} /> Word</button>
                        <button onClick={() => handleExportQuotation(q, 'pdf')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#DC2626] bg-[#DC2626]/5 rounded-md"><FileText size={12} /> PDF</button>
                        <button onClick={() => handleQEdit(q)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#0D9488] bg-[#0D9488]/5 rounded-md">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> 编辑
                        </button>
                        <button onClick={() => handleQDelete(q.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#DC2626] bg-[#DC2626]/5 rounded-md"><Trash2 size={12} /> 删除</button>
                      </div>
                    )}
                    <div className="p-3 md:p-5 bg-gray-50/50">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">报价单标题</label><input value={form!.title} onChange={e => setForm({ ...form!, title: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">收件单位</label><input value={form!.company} onChange={e => setForm({ ...form!, company: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">发件人</label><input value={form!.sender} onChange={e => setForm({ ...form!, sender: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">收件人</label><input value={form!.recipient} onChange={e => setForm({ ...form!, recipient: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">报价日期</label><input type="date" value={form!.date} onChange={e => setForm({ ...form!, date: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">联系电话</label><input value={form!.phone} onChange={e => setForm({ ...form!, phone: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">有效期起</label><input type="date" value={form!.validFrom} onChange={e => setForm({ ...form!, validFrom: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">有效期止</label><input type="date" value={form!.validTo} onChange={e => setForm({ ...form!, validTo: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">最小起订量 (KG)</label><input type="number" value={form!.moq} onChange={e => setForm({ ...form!, moq: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex items-center gap-2"><Building2 size={14} className="text-[#7C3AED] shrink-0" /><span className="text-xs text-[#6C757B]">收件单位：</span><span className="text-sm text-[#1A1A2E] font-medium">{displayQ.company || '-'}</span></div>
                          <div className="flex items-center gap-2"><User size={14} className="text-[#7C3AED] shrink-0" /><span className="text-xs text-[#6C757B]">发件人：</span><span className="text-sm text-[#1A1A2E] font-medium">{displayQ.sender || '-'}</span></div>
                          <div className="flex items-center gap-2"><User size={14} className="text-[#0284C7] shrink-0" /><span className="text-xs text-[#6C757B]">收件人：</span><span className="text-sm text-[#1A1A2E] font-medium">{displayQ.recipient || '-'}</span></div>
                          <div className="flex items-center gap-2"><Calendar size={14} className="text-[#059669] shrink-0" /><span className="text-xs text-[#6C757B]">报价日期：</span><span className="text-sm text-[#1A1A2E] font-mono">{displayQ.date || '-'}</span></div>
                          <div className="flex items-center gap-2"><Clock size={14} className="text-[#D97706] shrink-0" /><span className="text-xs text-[#6C757B]">有效期：</span><span className="text-sm text-[#1A1A2E] font-mono">{displayQ.validFrom} ~ {displayQ.validTo}</span></div>
                          <div className="flex items-center gap-2"><Phone size={14} className="text-[#0284C7] shrink-0" /><span className="text-xs text-[#6C757B]">联系电话：</span><span className="text-sm text-[#1A1A2E] font-mono">{displayQ.phone || '-'}</span></div>
                          <div className="flex items-center gap-2"><Package size={14} className="text-[#EA580C] shrink-0" /><span className="text-xs text-[#6C757B]">MOQ：</span><span className="text-sm text-[#1A1A2E] font-mono">{displayQ.moq} KG</span></div>
                          {displayQ.note && <div className="flex items-center gap-2 md:col-span-2"><AlertCircle size={14} className="text-[#DC2626] shrink-0" /><span className="text-xs text-[#6C757B]">备注：</span><span className="text-sm text-[#1A1A2E]">{displayQ.note}</span></div>}
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-5">
                      <div className="overflow-x-auto -mx-3 md:mx-0">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead><tr className="bg-gray-50">
                          <th className="text-left text-[#6C757B] font-medium text-xs p-3 pl-4 uppercase tracking-wider">材料名称</th>
                          <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">牌号</th>
                          <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">价格（元/kg）</th>
                          <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">备注</th>
                          {isEditing && <th className="w-16 text-center text-[#6C757B] font-medium text-xs p-3">操作</th>}
                        </tr></thead>
                        <tbody>
                          {displayQ.items.map((item, index) => (
                            <tr key={item.id} className={`border-b border-[#E2E8F0]/60 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              {isEditing ? (
                                <>
                                  <td className="p-3 pl-4"><input value={item.material} onChange={e => handleUpdateItem(item.id, 'material', e.target.value)} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1.5 text-sm focus:outline-none focus:border-[#7C3AED] rounded" /></td>
                                  <td className="p-3"><input value={item.grade} onChange={e => handleUpdateItem(item.id, 'grade', e.target.value)} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1.5 text-sm font-mono focus:outline-none focus:border-[#7C3AED] rounded" /></td>
                                  <td className="p-3"><input type="number" value={item.price} onChange={e => handleUpdateItem(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1.5 text-sm font-mono text-right focus:outline-none focus:border-[#7C3AED] rounded" /></td>
                                  <td className="p-3"><input value={item.remark} onChange={e => handleUpdateItem(item.id, 'remark', e.target.value)} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1.5 text-sm focus:outline-none focus:border-[#7C3AED] rounded" /></td>
                                  <td className="p-3 text-center"><button onClick={() => handleRemoveItem(item.id)} className="p-1 text-[#6C757B] hover:text-[#DC2626] transition-colors"><Trash2 size={14} /></button></td>
                                </>
                              ) : (
                                <>
                                  <td className="p-3 pl-4 text-[#1A1A2E] font-medium">{item.material || '-'}</td>
                                  <td className="p-3 text-[#7C3AED] font-mono text-sm">{item.grade || '-'}</td>
                                  <td className="p-3 text-right font-mono font-bold text-[#DC2626]">¥{(item.price ?? 0).toFixed(2)}</td>
                                  <td className="p-3 text-[#6C757B] text-sm">{item.remark || '-'}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                      {isEditing && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-3"><label className="text-xs text-[#6C757B] mb-1 block font-medium">备注</label><input value={form!.note} onChange={e => setForm({ ...form!, note: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div className="md:col-span-3"><label className="text-xs text-[#6C757B] mb-1 block font-medium">问候正文</label><textarea value={form!.greeting || ''} onChange={e => setForm({ ...form!, greeting: e.target.value })} rows={2} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg resize-none" /></div>
                          <div className="md:col-span-3"><label className="text-xs text-[#6C757B] mb-1 block font-medium">联系提示</label><input value={form!.footerContact || ''} onChange={e => setForm({ ...form!, footerContact: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div className="md:col-span-2"><label className="text-xs text-[#6C757B] mb-1 block font-medium">公司名称</label><input value={form!.footerCompany || ''} onChange={e => setForm({ ...form!, footerCompany: e.target.value })} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg" /></div>
                          <div><label className="text-xs text-[#6C757B] mb-1 block font-medium">结尾敬语</label><textarea value={form!.closing || ''} onChange={e => setForm({ ...form!, closing: e.target.value })} rows={2} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#7C3AED] rounded-lg resize-none" /></div>
                        </div>
                      )}
                      {isEditing && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#7C3AED]/40 text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors rounded-lg"><Plus size={12} /> 添加材料</button>
                          <button onClick={handleQSaveEdit} className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-gradient-to-r from-[#7C3AED] to-[#E11D48] text-white rounded-lg hover:shadow-lg transition-all"><Save size={12} /> 保存修改</button>
                          <button onClick={handleQSyncToRecords} className="flex items-center gap-1.5 px-4 py-1.5 text-xs border border-[#059669]/40 text-[#059669] hover:bg-[#059669]/5 transition-colors rounded-lg" title="不修改报价单，只把材料同步到报价记录"><FileText size={12} /> 同步到报价记录</button>
                          <button onClick={handleQCancelEdit} className="px-4 py-1.5 text-xs text-[#6C757B] border border-[#E2E8F0] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors rounded-lg">取消</button>
                          <span className="text-xs text-[#6C757B]/70 hidden md:inline">提示：保存修改会自动同步到报价记录</span>
                        </div>
                      )}
                      {!isEditing && (
                        <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
                          <h4 className="text-xs font-medium text-[#6C757B] mb-3 flex items-center gap-1.5"><FileText size={12} /> 报价单正文预览</h4>
                          <div className="text-sm text-[#1A1A2E] space-y-1.5 leading-relaxed">
                            <p>{displayQ.greeting || '首先感谢您的信任与配合！ 对于贵司所需的工程塑料材料，我公司当前报价（含税）为：'}</p>
                            <p>有效期：{displayQ.validFrom} ~ {displayQ.validTo}</p>
                            <p>MOQ：{displayQ.moq} KG{displayQ.note ? `备注：(${displayQ.note})` : ''}</p>
                            <p>{displayQ.footerContact || '如有疑问，敬请来电垂询。'}</p>
                            <p>联系电话：{displayQ.sender || '-'}{displayQ.phone || '-'}</p>
                            <p className="whitespace-pre-line">{displayQ.closing || '顺祝\n商祺！'}</p>
                            <p className="font-bold">{displayQ.footerCompany || DEFAULTS.quotation.footerCompany}</p>
                            <p className="text-right text-[#6C757B]">{displayQ.date?.replace(/-/g, '/')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ==================== 分隔线 ==================== */}
      <div className="flex items-center gap-4 my-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />
        <span className="text-xs text-[#7C3AED] font-medium px-3">报价记录</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />
      </div>

      {/* ==================== 报价记录区域 ==================== */}

      {/* v7 新增：被动同步机制说明 */}
      <div className="mb-3 p-3 bg-[#0284C7]/5 border border-[#0284C7]/20 rounded-lg flex items-start gap-2">
        <Info size={14} className="text-[#0284C7] mt-0.5 shrink-0" />
        <div className="text-xs text-[#1A1A2E] leading-relaxed">
          <span className="font-bold text-[#0284C7]">💡 同步机制：</span>
          保存报价单时，<span className="font-medium">会自动把该报价单的所有有效材料同步到此处</span>。
          标记为 <code className="px-1 bg-white border border-[#E2E8F0] rounded font-mono">auto-xxx</code> 的记录是自动同步的，<code className="px-1 bg-white border border-[#E2E8F0] rounded font-mono">manual-xxx</code> 是手动添加的。
        </div>
      </div>

      {/* 报价记录表格 */}
      <section className="border border-[#E2E8F0] bg-white rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 md:p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 min-w-0 shrink">
              <Receipt size={16} className="text-[#1A1A2E] shrink-0" />
              <h3 className="text-base font-bold text-[#1A1A2E] shrink-0 whitespace-nowrap">报价记录</h3>
              {records.length > 0 && <span className="px-2 py-0.5 text-xs font-mono bg-[#7C3AED]/5 text-[#7C3AED] border border-[#7C3AED]/20 rounded-full shrink-0">{records.length}</span>}
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <div className="relative hidden sm:block">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6C757B]/50" />
                <input
                  type="text"
                  value={rSearch}
                  onChange={e => setRSearch(e.target.value)}
                  placeholder="搜索 客户/材料/牌号/状态/联系人/电话/备注"
                  className="w-60 md:w-80 pl-8 pr-8 py-1.5 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#7C3AED]/40 bg-white placeholder:text-[#6C757B]/40"
                />
                {rSearch && (
                  <button onClick={() => setRSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6C757B]/50 hover:text-[#DC2626]"><X size={12} /></button>
                )}
              </div>
              <button onClick={() => setShowAdvanced(v => !v)} className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${showAdvanced ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5' : 'border-[#E2E8F0] text-[#6C757B] hover:border-[#7C3AED]/40 hover:text-[#7C3AED]'}`}>
                高级
              </button>
              {selectedIds.size > 0 && (
                <button onClick={handleBatchDelete} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-lg"><Trash2 size={12} /> 删除选中 ({selectedIds.size})</button>
              )}
              <div className="relative">
                <button onClick={() => setShowExport(!showExport)} disabled={records.length === 0}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs border border-[#7C3AED]/40 text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors disabled:opacity-30 rounded-lg"
                >
                  <Download size={12} /> <span className="hidden md:inline">{selectedIds.size > 0 ? `导出选中 (${selectedIds.size})` : '导出筛选结果'}</span>
                </button>
                {showExport && records.length > 0 && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-10 py-2 min-w-[220px]">
                    <p className="px-3 py-1 text-xs text-[#6C757B] font-medium">{selectedIds.size > 0 ? `导出选中的 ${selectedIds.size} 条记录` : rSearch.trim() ? `导出筛选的 ${filteredRecords.length} 条记录` : '导出全部记录'}</p>
                    {EXPORT_FORMATS.map(fmt => {
                      const Icon = fmt.icon;
                      return <button key={fmt.key} onClick={() => handleExport(fmt.key)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#1A1A2E] hover:bg-gray-50 transition-colors"><Icon size={14} className="text-[#7C3AED]" /><span className="font-medium">{fmt.label}</span><span className="text-xs text-[#6C757B] ml-auto">{fmt.ext}</span></button>;
                    })}
                  </div>
                )}
              </div>
              <button onClick={handleRClear} disabled={records.length === 0} className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors disabled:opacity-30 rounded-lg"><RotateCcw size={12} /> <span className="hidden md:inline">清空</span></button>
            </div>
          </div>
          {/* 高级搜索面板 */}
          {showAdvanced && (
            <div className="hidden sm:flex items-center gap-3 mt-3 pt-3 border-t border-[#E2E8F0]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#6C757B]">日期</span>
                <input type="date" value={advDateFrom} onChange={e => setAdvDateFrom(e.target.value)} className="px-2 py-1 text-xs border border-[#E2E8F0] rounded focus:outline-none focus:border-[#7C3AED]/40 bg-gray-50/50" />
                <span className="text-xs text-[#6C757B]">~</span>
                <input type="date" value={advDateTo} onChange={e => setAdvDateTo(e.target.value)} className="px-2 py-1 text-xs border border-[#E2E8F0] rounded focus:outline-none focus:border-[#7C3AED]/40 bg-gray-50/50" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#6C757B]">金额</span>
                <input type="number" value={advAmountMin} onChange={e => setAdvAmountMin(e.target.value)} placeholder="最小" className="w-20 px-2 py-1 text-xs border border-[#E2E8F0] rounded focus:outline-none focus:border-[#7C3AED]/40 bg-gray-50/50 placeholder:text-[#6C757B]/40" />
                <span className="text-xs text-[#6C757B]">~</span>
                <input type="number" value={advAmountMax} onChange={e => setAdvAmountMax(e.target.value)} placeholder="最大" className="w-20 px-2 py-1 text-xs border border-[#E2E8F0] rounded focus:outline-none focus:border-[#7C3AED]/40 bg-gray-50/50 placeholder:text-[#6C757B]/40" />
              </div>
              <button onClick={() => { setAdvDateFrom(''); setAdvDateTo(''); setAdvAmountMin(''); setAdvAmountMax(''); }} className="px-2.5 py-1 text-xs text-[#6C757B] border border-[#E2E8F0] rounded hover:border-[#DC2626]/40 hover:text-[#DC2626] transition-colors">重置</button>
              <span className="text-xs text-[#7C3AED]">已筛选 {filteredRecords.length} 条</span>
            </div>
          )}
          {/* 移动端选中信息 & 批量删除 */}
          {selectedIds.size > 0 && (
            <div className="md:hidden flex items-center justify-between mt-2 pt-2 border-t border-[#E2E8F0]">
              <span className="px-2.5 py-1 text-xs font-medium bg-[#0284C7]/5 text-[#0284C7] border border-[#0284C7]/20 rounded-full">已选 {selectedIds.size} 条 · {selectedQuantity}KG · ¥{selectedAmount.toFixed(2)}</span>
              <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-lg"><Trash2 size={12} /> 删除选中</button>
            </div>
          )}
        </div>
        {records.length === 0 ? (
          <div className="empty-state">
            <Receipt size={48} className="empty-state-icon" />
            <p className="empty-state-title">暂无报价记录</p>
            <p className="empty-state-desc">保存报价单后自动生成记录</p>
          </div>
        ) : (
          <>
          {/* 桌面端表格 */}
          <div className="hidden md:block overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="bg-gray-50">
                <th className="w-10 text-center text-[#6C757B] font-medium text-xs p-3 pl-4"><button onClick={toggleSelectAll} className="p-0.5 hover:scale-110 transition-transform" title={isAllSelected ? '取消全选' : '全选'}>{isAllSelected ? <CheckSquare size={16} className="text-[#7C3AED]" /> : <Square size={16} className="text-[#6C757B]/40" />}</button></th>
                <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">客户</th>
                <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">日期</th>
                <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">材料</th>
                <th className="text-left text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">牌号</th>
                <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">数量</th>
                <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">单价</th>
                <th className="text-right text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">金额</th>
                <th className="text-center text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider">状态</th>
                <th className="text-center text-[#6C757B] font-medium text-xs p-3 uppercase tracking-wider w-24">操作</th>
              </tr></thead>
              <tbody>
                {sortedRecords.map((record, index) => {
                  const isSelected = selectedIds.has(record.id);
                  const sc = STATUS_CONFIG[record.status] || STATUS_CONFIG['待确认'];
                  const isEditing = rEditId === record.id;
                  if (isEditing) {
                    return (
                      <>
                        <tr key={record.id} className="border-b border-[#0D9488]/30 bg-[#0D9488]/5">
                          <td className="p-2 pl-4 text-center"><CheckSquare size={16} className="text-[#0D9488]" /></td>
                          <td className="p-2"><input value={rForm.customer} onChange={e => setRForm(p => ({...p, customer: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white" /></td>
                          <td className="p-2"><input type="date" value={rForm.date} onChange={e => setRForm(p => ({...p, date: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white" /></td>
                          <td className="p-2"><input value={rForm.material} onChange={e => setRForm(p => ({...p, material: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white" /></td>
                          <td className="p-2"><input value={rForm.grade} onChange={e => setRForm(p => ({...p, grade: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white" /></td>
                          <td className="p-2"><input type="number" value={rForm.quantity} onChange={e => setRForm(p => ({...p, quantity: e.target.value}))} className="w-20 px-2 py-1 text-sm text-right border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white" /></td>
                          <td className="p-2"><input type="number" value={rForm.unitPrice} onChange={e => setRForm(p => ({...p, unitPrice: e.target.value}))} className="w-24 px-2 py-1 text-sm text-right border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white" /></td>
                          <td className="p-2 text-right font-mono font-medium text-[#7C3AED]">¥{previewAmount}</td>
                          <td className="p-2 text-center">
                            <select value={rForm.status} onChange={e => setRForm(p => ({...p, status: e.target.value as QuotationRecord['status']}))} className="px-2 py-1 text-xs border border-[#0D9488]/40 rounded focus:outline-none focus:border-[#0D9488] bg-white">
                              <option value="待确认">待确认</option>
                              <option value="已确认">已确认</option>
                              <option value="已取消">已取消</option>
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={handleRAdd} className="flex items-center gap-1 p-1.5 text-[#059669] hover:bg-[#059669]/5 transition-colors rounded-md text-xs font-medium" title="保存"><Save size={14} /> 保存</button>
                              <button onClick={resetRForm} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:bg-gray-100 transition-colors rounded-md text-xs" title="取消"><X size={14} /> 取消</button>
                            </div>
                          </td>
                        </tr>
                        {rFormError && (
                          <tr className="bg-[#DC2626]/5">
                            <td colSpan={10} className="p-2 pl-4 text-xs text-[#DC2626]">{rFormError}</td>
                          </tr>
                        )}
                      </>
                    );
                  }
                  return (
                    <tr key={record.id} onDoubleClick={() => handleREdit(record)} className={`border-b border-[#E2E8F0]/60 transition-colors cursor-pointer ${isSelected ? 'bg-[#7C3AED]/5' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-gray-50`}>
                      <td className="p-3 pl-4 text-center"><button onClick={() => toggleSelect(record.id)} className="p-0.5 hover:scale-110 transition-transform">{isSelected ? <CheckSquare size={16} className="text-[#7C3AED]" /> : <Square size={16} className="text-[#6C757B]/40" />}</button></td>
                      <td className="p-3 text-[#1A1A2E] font-medium">{record.customer}</td>
                      <td className="p-3 font-mono text-[#1A1A2E] text-sm">{(record.date || '').slice(5)}</td>
                      <td className="p-3 text-[#1A1A2E]">{record.material}</td>
                      <td className="p-3 text-[#7C3AED] font-mono text-sm">{record.grade}</td>
                      <td className="p-3 text-right font-mono text-[#0284C7]">{record.quantity}</td>
                      <td className="p-3 text-right font-mono text-[#6C757B]">¥{(record.unitPrice ?? 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-medium text-[#7C3AED]">¥{calcAmount(record.quantity, record.unitPrice ?? 0).toFixed(2)}</td>
                      <td className="p-3 text-center"><span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full" style={{ color: sc.color, backgroundColor: sc.bg, border: `1px solid ${sc.color}25` }}>{record.status}</span></td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleREdit(record)} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#0D9488] hover:bg-[#0D9488]/5 transition-colors rounded-md text-xs" title="编辑"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> 编辑</button>
                          <button onClick={() => handleRDelete(record.id)} className="flex items-center gap-1 p-1.5 text-[#6C757B] hover:text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors rounded-md text-xs" title="删除"><Trash2 size={14} /> 删除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-[#7C3AED]/5 to-[#0284C7]/5 border-t-2 border-[#7C3AED]/20">
                  <td className="p-3 pl-4"></td>
                  <td className="p-3"><span className="text-sm font-bold text-[#1A1A2E]">合计</span><span className="text-xs text-[#6C757B] ml-2">{records.length} 条</span></td>
                  <td></td><td></td><td></td>
                  <td className="p-3 text-right font-mono font-bold text-[#0284C7]">{totalQuantity}</td>
                  <td></td>
                  <td className="p-3 text-right font-mono text-xl font-bold text-[#7C3AED]">¥{totalAmount.toFixed(2)}</td>
                  <td></td><td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* 移动端卡片列表 */}
          <div className="md:hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-[#E2E8F0]">
              <button onClick={toggleSelectAll} className="text-xs text-[#7C3AED] font-medium">{isAllSelected ? '取消全选' : '全选'}</button>
              <span className="text-xs text-[#6C757B]">合计 ¥{totalAmount.toFixed(2)} · {totalQuantity}KG</span>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {sortedRecords.map(record => {
                const isSelected = selectedIds.has(record.id);
                const sc = STATUS_CONFIG[record.status];
                const isEditing = rEditId === record.id;
                if (isEditing) {
                  return (
                    <div key={record.id} className="p-3 bg-[#0D9488]/5 border-l-4 border-[#0D9488]">
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[11px] text-[#6C757B]">客户</label><input value={rForm.customer} onChange={e => setRForm(p => ({...p, customer: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white" /></div>
                        <div><label className="text-[11px] text-[#6C757B]">日期</label><input type="date" value={rForm.date} onChange={e => setRForm(p => ({...p, date: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white" /></div>
                        <div><label className="text-[11px] text-[#6C757B]">材料</label><input value={rForm.material} onChange={e => setRForm(p => ({...p, material: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white" /></div>
                        <div><label className="text-[11px] text-[#6C757B]">牌号</label><input value={rForm.grade} onChange={e => setRForm(p => ({...p, grade: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white" /></div>
                        <div><label className="text-[11px] text-[#6C757B]">数量</label><input type="number" value={rForm.quantity} onChange={e => setRForm(p => ({...p, quantity: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white" /></div>
                        <div><label className="text-[11px] text-[#6C757B]">单价</label><input type="number" value={rForm.unitPrice} onChange={e => setRForm(p => ({...p, unitPrice: e.target.value}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white" /></div>
                        <div><label className="text-[11px] text-[#6C757B]">状态</label>
                          <select value={rForm.status} onChange={e => setRForm(p => ({...p, status: e.target.value as QuotationRecord['status']}))} className="w-full px-2 py-1 text-sm border border-[#0D9488]/40 rounded bg-white">
                            <option value="待确认">待确认</option><option value="已确认">已确认</option><option value="已取消">已取消</option>
                          </select>
                        </div>
                        <div><label className="text-[11px] text-[#6C757B]">金额</label><p className="text-sm font-bold text-[#7C3AED]">¥{previewAmount}</p></div>
                      </div>
                      {rFormError && <p className="mt-2 text-xs text-[#DC2626]">{rFormError}</p>}
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button onClick={handleRAdd} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#059669] rounded-lg"><Save size={12} /> 保存</button>
                        <button onClick={resetRForm} className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#6C757B] border border-[#E2E8F0] rounded-lg"><X size={12} /> 取消</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={record.id} onDoubleClick={() => handleREdit(record)} className={`p-3 transition-colors cursor-pointer ${isSelected ? 'bg-[#7C3AED]/5' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <button onClick={() => toggleSelect(record.id)} className="mt-0.5 shrink-0">{isSelected ? <CheckSquare size={16} className="text-[#7C3AED]" /> : <Square size={16} className="text-[#6C757B]/40" />}</button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-[#1A1A2E] truncate">{record.customer}</p>
                            {/* v7 新增：原报价单已删除徽章（移动端） */}
                            {record.quotationId && !quotations.find(q => q.id === record.quotationId) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono bg-[#6C757B]/10 text-[#6C757B] border border-[#6C757B]/20 rounded shrink-0" title="该记录的原报价单已被删除">原报价单已删除</span>
                            )}
                          </div>
                          <p className="text-xs text-[#6C757B] mt-0.5">{record.material} · {record.grade}</p>
                        </div>
                      </div>
                      <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0" style={{ color: sc.color, backgroundColor: sc.bg, border: `1px solid ${sc.color}25` }}>{record.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pl-6">
                      <div className="flex items-center gap-3 text-xs text-[#6C757B]">
                        <span>{(record.date || '').slice(5)}</span>
                        <span>{record.quantity}KG</span>
                        <span>¥{(record.unitPrice ?? 0).toFixed(2)}/kg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-[#7C3AED]">¥{calcAmount(record.quantity, record.unitPrice ?? 0).toFixed(2)}</span>
                        <button onClick={() => handleREdit(record)} className="p-1 text-[#6C757B] hover:text-[#0D9488] transition-colors" title="编辑">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => handleRDelete(record.id)} className="p-1 text-[#6C757B] hover:text-[#DC2626] transition-colors" title="删除"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}
      </section>

      {/* v7 新增：Toast 提示（右上角浮动） */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md w-[90vw] md:w-auto md:min-w-[360px] rounded-xl shadow-2xl border-2 animate-[slideIn_0.2s_ease-out] ${
            toast.type === 'success' ? 'bg-[#059669]/10 border-[#059669] backdrop-blur' :
            toast.type === 'error' ? 'bg-[#DC2626]/10 border-[#DC2626] backdrop-blur' :
            toast.type === 'warning' ? 'bg-[#D97706]/10 border-[#D97706] backdrop-blur' :
            'bg-[#0284C7]/10 border-[#0284C7] backdrop-blur'
          }`}
          role="alert"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle size={20} className="text-[#059669]" />}
                {toast.type === 'error' && <AlertCircle size={20} className="text-[#DC2626]" />}
                {toast.type === 'warning' && <AlertCircle size={20} className="text-[#D97706]" />}
                {toast.type === 'info' && <FileText size={20} className="text-[#0284C7]" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm ${
                  toast.type === 'success' ? 'text-[#059669]' :
                  toast.type === 'error' ? 'text-[#DC2626]' :
                  toast.type === 'warning' ? 'text-[#D97706]' :
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
          </div>
        </div>
      )}

      {/* v7 新增：删除报价单二次确认弹窗 */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          quotationTitle={deleteConfirm.quotationTitle}
          relatedCount={deleteConfirm.relatedCount}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// v7 新增：删除确认弹窗（仅在保留/级联两选一时显示）
function DeleteConfirmDialog({
  quotationTitle,
  relatedCount,
  onCancel,
  onConfirm,
}: {
  quotationTitle: string;
  relatedCount: number;
  onCancel: () => void;
  onConfirm: (cascade: boolean, remember: boolean) => void;
}) {
  const [remember, setRemember] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 md:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#DC2626]/10 flex items-center justify-center">
            <AlertCircle size={20} className="text-[#DC2626]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-[#1A1A2E]">删除报价单</h3>
            <p className="text-sm text-[#6C757B] mt-1">「{quotationTitle}」关联了 <span className="font-mono font-bold text-[#DC2626]">{relatedCount}</span> 条报价记录，请选择处理方式：</p>
          </div>
        </div>

        <div className="space-y-2 mb-4 text-xs text-[#6C757B] bg-gray-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle size={14} className="text-[#059669] mt-0.5 shrink-0" />
            <span><b className="text-[#1A1A2E]">仅删除报价单</b>：保留 {relatedCount} 条历史记录，记录将标记为「原报价单已删除」</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
            <span><b className="text-[#1A1A2E]">同时删除记录</b>：级联删除 {relatedCount} 条关联记录（不可恢复）</span>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#6C757B] cursor-pointer mb-4 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#7C3AED] cursor-pointer"
          />
          记住选择，下次删除时不再询问
        </label>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-[#E2E8F0] text-[#6C757B] hover:bg-gray-50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(true, remember)}
            className="px-4 py-2 text-sm border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5 rounded-lg transition-colors"
          >
            同时删除 {relatedCount} 条记录
          </button>
          <button
            onClick={() => onConfirm(false, remember)}
            className="px-4 py-2 text-sm bg-[#7C3AED] text-white hover:bg-[#6D28D9] rounded-lg transition-colors"
          >
            仅删除报价单
          </button>
        </div>
      </div>
    </div>
  );
}
