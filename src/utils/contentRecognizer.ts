﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// 智能内容识别引擎 - 支持文本/图片/PDF/Word/Excel解析为材料行
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface RecognizedItem {
  material: string;
  grade: string;
  price: number;
  remark: string;
}

// 发货记录识别结果
export interface RecognizedShippingItem {
  customer: string;
  date: string;
  material: string;
  grade: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

// 出行记录识别结果
export interface RecognizedTravelItem {
  date: string;
  type: string;
  from: string;
  to: string;
  amount: number;
  km: number;
}

export type RecognizeStatus = 'idle' | 'loading' | 'recognizing' | 'done' | 'error';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 动态加载 pdfjsDist 并设置 worker
async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    } catch {
      // CDN不可用时使用内联worker（降级方案）
      console.warn('[Recognizer] PDF.js Worker CDN 不可用，PDF识别功能可能受限，请检查网络连接');
    }
  }
  return pdfjsLib;
}

function roundPrice(n: number): number { return Math.round(n * 100) / 100; }

// ========== 文本解析 ==========

// 塑料材料常见关键词
const MATERIAL_KEYWORDS = [
  'PP', 'PA66', 'PA6', 'PBT', 'ABS', 'PC', 'PE', 'PET', 'POM',
  'PPS', 'PPO', 'PMMA', 'PVC', 'TPU', 'TPE', 'TPV', 'PP-TD',
  'PA66-GF', 'PA6-GF', 'PC/ABS', 'PC/PBT', 'PA66-FR',
];

/**
 * 从文本行中提取材料信息
 * 支持格式:
 *   PP-TD20  8.50
 *   PA66-GF30  FR502  12.5元/kg
 *   POM  M90-44  15.8
 *   PP   PM4-R04  9.2  含税
 *   表格行: PP-TD20 | 8.50 | 备注
 */
function parseTextLine(line: string): RecognizedItem | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return null;

  // 跳过表头行
  const headerKeywords = ['材料', '牌号', '价格', '备注', '序号', '编号', '名称', 'material', 'grade', 'price', 'remark', '合计', '总计', '小计'];
  if (headerKeywords.some(k => trimmed.toLowerCase().includes(k.toLowerCase()))) return null;

  // 价格匹配: 数字(可含小数) 后面可能跟 元/kg, 元, /kg 等
  const _pricePattern = /(\d+\.?\d*)\s*(?:元\/kg|元\/千克|\/kg|元|￥|¥)?/i;

  // 尝试按分隔符拆分 (制表符、|、多个空格)
  const parts = trimmed.split(/[\t|]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 1) {
    // 尝试多空格拆分
    const spaceParts = trimmed.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
    if (spaceParts.length > 1) return parseParts(spaceParts);
    // 单个token，尝试提取
    return parseSingleToken(trimmed);
  }
  return parseParts(parts);
}

function parseParts(parts: string[]): RecognizedItem | null {
  if (parts.length < 1) return null;

  let material = '';
  let grade = '';
  let price = 0;
  let remark = '';

  // 识别各部分
  const usedIndices = new Set<number>();

  // 找价格 (纯数字或带货币符号)
  for (let i = 0; i < parts.length; i++) {
    const priceMatch = parts[i].match(/^[￥¥]?\s*(\d+\.?\d*)\s*(?:元\/kg|元\/千克|\/kg|元)?$/i);
    if (priceMatch) {
      price = roundPrice(parseFloat(priceMatch[1]));
      usedIndices.add(i);
      break;
    }
  }

  // 如果没找到价格，尝试从合并的文本中提取
  if (price === 0) {
    for (let i = 0; i < parts.length; i++) {
      const priceMatch = parts[i].match(/(\d+\.?\d*)\s*(?:元\/kg|元\/千克|\/kg|元)/i);
      if (priceMatch && parseFloat(priceMatch[1]) > 0 && parseFloat(priceMatch[1]) < 100000) {
        price = roundPrice(parseFloat(priceMatch[1]));
        usedIndices.add(i);
        break;
      }
    }
  }

  // 找材料名 (包含塑料材料关键词)
  for (let i = 0; i < parts.length; i++) {
    if (usedIndices.has(i)) continue;
    const upper = parts[i].toUpperCase();
    if (MATERIAL_KEYWORDS.some(k => upper.includes(k)) || /^[PABTSECR][A-Z0-9]*[-.]/.test(upper)) {
      material = parts[i];
      usedIndices.add(i);
      break;
    }
  }

  // 剩余部分分配
  const remaining = parts.filter((_, i) => !usedIndices.has(i));

  if (!material && remaining.length > 0) {
    // 第一个未使用的部分作为材料名
    material = remaining.shift() || '';
  }

  if (remaining.length > 0 && !grade) {
    grade = remaining.shift() || '';
  }

  remark = remaining.join(' ');

  if (!material && price === 0) return null;

  return { material, grade, price, remark };
}

function parseSingleToken(token: string): RecognizedItem | null {
  // 尝试匹配: PP-TD20 8.5元 / PP.TD20 8.5元
  const match = token.match(/^(.+?)\s+(\d+\.?\d*)\s*(?:元\/kg|元\/千克|\/kg|元)?$/i);
  if (match) {
    const name = match[1].trim();
    const p = roundPrice(parseFloat(match[2]));
    if (p > 0 && p < 100000) {
      // 尝试拆分材料名和牌号（支持 - 和 . 作为连接符）
      const sepIdx = name.search(/[-.]/);
      if (sepIdx > 0 && /^[A-Z]{1,4}/i.test(name)) {
        return { material: name, grade: '', price: p, remark: '' };
      }
      return { material: name, grade: '', price: p, remark: '' };
    }
  }
  // 可能只是材料名
  const upper = token.toUpperCase();
  if (MATERIAL_KEYWORDS.some(k => upper.includes(k)) || /^[PABTSECR][A-Z0-9]*[-.]/.test(upper)) {
    return { material: token, grade: '', price: 0, remark: '' };
  }
  return null;
}

/**
 * 从纯文本中解析材料行
 */
export function parseTextContent(text: string): RecognizedItem[] {
  const lines = text.split(/\n/);
  const items: RecognizedItem[] = [];

  for (const line of lines) {
    const item = parseTextLine(line);
    if (item && (item.material || item.price > 0)) {
      items.push(item);
    }
  }

  return items;
}

// ========== 图片 OCR ==========

/**
 * 从图片中识别文字并解析材料行
 */
export async function recognizeFromImage(
  file: File | Blob,
  onProgress?: (progress: number) => void
): Promise<RecognizedItem[]> {
  if (file instanceof File && file.size === 0) throw new Error('文件为空');
  if (file instanceof File && file.size > MAX_FILE_SIZE) throw new Error('文件大小超过50MB限制');

  const Tesseract = await import('tesseract.js');
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('OCR识别超时，请尝试更小的图片')), 120000)
  );
  const result = await Promise.race([
    Tesseract.recognize(file, 'chi_sim+eng', {
      logger: (info) => {
        if (info.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(info.progress * 100));
        } else if ((info.status === 'loading tesseract core' || info.status === 'loading language traineddata') && onProgress) {
          onProgress(Math.round(info.progress * 30));
        }
      },
    }),
    timeout
  ]);

  const text = result.data.text;
  return parseTextContent(text);
}

// ========== PDF 解析 ==========

/**
 * 从PDF中提取文本并解析材料行
 */
export async function recognizeFromPdf(file: File | Blob): Promise<RecognizedItem[]> {
  if (file instanceof File && file.size === 0) throw new Error('文件为空');
  if (file instanceof File && file.size > MAX_FILE_SIZE) throw new Error('文件大小超过50MB限制');
  try {
    const pdfjsLib = await loadPdfjs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: TextItem) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    return parseTextContent(textParts.join('\n'));
  } catch (e) {
    if (e instanceof Error && (e.message.includes('worker') || e.message.includes('Worker') || e.message.includes('network') || e.message.includes('fetch'))) {
      throw new Error('PDF识别不可用，请检查网络连接后重试');
    }
    throw e;
  }
}

// ========== Word 解析 ==========

/**
 * 从Word文档中提取文本并解析材料行
 */
export async function recognizeFromWord(file: File | Blob): Promise<RecognizedItem[]> {
  try {
    if (file instanceof File && file.size === 0) throw new Error('文件为空');
    if (file instanceof File && file.size > MAX_FILE_SIZE) throw new Error('文件大小超过50MB限制');
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return parseTextContent(result.value);
  } catch (err) {
    console.error('[Recognizer] Word解析失败:', err);
    throw new Error(err instanceof Error ? err.message : 'Word文件解析失败');
  }
}

// ========== Excel 解析 ==========

/**
 * 从Excel文件中提取材料行
 * 自动识别表头映射
 */
export async function recognizeFromExcel(file: File | Blob): Promise<RecognizedItem[]> {
  try {
    if (file instanceof File && file.size > MAX_FILE_SIZE) throw new Error('文件大小超过50MB限制');
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  const MAX_ROWS = 500;
  const effectiveRows = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;

  if (effectiveRows.length < 2) return [];

  // 识别表头
  const header = effectiveRows[0].map(h => String(h || '').trim().toLowerCase());
  const colMap = { material: -1, grade: -1, price: -1, remark: -1 };

  header.forEach((h, i) => {
    if (/材料|material|名称|name/.test(h)) colMap.material = i;
    else if (/牌号|grade|型号|model|编号/.test(h)) colMap.grade = i;
    else if (/价格|price|单价|unitprice|报价/.test(h)) colMap.price = i;
    else if (/备注|remark|说明|note/.test(h)) colMap.remark = i;
  });

  // 如果没有匹配到表头，尝试按列位置猜测
  if (colMap.material === -1 && colMap.price === -1) {
    // 假设: 第1列材料名, 第2列牌号, 第3列价格, 第4列备注
    if (effectiveRows[0].length >= 2) colMap.material = 0;
    if (effectiveRows[0].length >= 2) colMap.grade = 1;
    if (effectiveRows[0].length >= 3) colMap.price = 2;
    if (effectiveRows[0].length >= 4) colMap.remark = 3;
    // 从第0行开始（无表头）
    return parseExcelRows(effectiveRows, colMap);
  }

  // 跳过表头行
  return parseExcelRows(effectiveRows.slice(1), colMap);
  } catch (err) {
    console.error('[Recognizer] Excel解析失败:', err);
    throw new Error(err instanceof Error ? err.message : 'Excel文件解析失败');
  }
}

function parseExcelRows(rows: string[][], colMap: Record<string, number>): RecognizedItem[] {
  const items: RecognizedItem[] = [];

  for (const row of rows) {
    const material = colMap.material >= 0 ? String(row[colMap.material] || '').trim() : '';
    const grade = colMap.grade >= 0 ? String(row[colMap.grade] || '').trim() : '';
    const priceRaw = colMap.price >= 0 ? row[colMap.price] : 0;
    const remark = colMap.remark >= 0 ? String(row[colMap.remark] || '').trim() : '';

    const price = typeof priceRaw === 'number' ? roundPrice(priceRaw) : roundPrice(parseFloat(String(priceRaw))) || 0;

    if (material || grade || price > 0) {
      items.push({ material, grade, price, remark });
    }
  }

  return items;
}

// ========== 统一入口 ==========

export type FileType = 'text' | 'image' | 'pdf' | 'word' | 'excel';

export function detectFileType(file: File): FileType {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(name)) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) return 'word';
  if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'excel';
  if (type === 'application/msword' || name.endsWith('.doc')) return 'word';

  // 兜底按扩展名
  if (name.endsWith('.doc')) return 'word';
  if (name.endsWith('.csv')) return 'excel';

  throw new Error('不支持的文件格式，请上传图片/PDF/Word/Excel文件');
}

/**
 * 统一识别入口
 */
export async function recognizeContent(
  source: string | File | Blob,
  fileType?: FileType,
  onProgress?: (progress: number) => void
): Promise<RecognizedItem[]> {
  // 纯文本
  if (typeof source === 'string') {
    return parseTextContent(source);
  }

  const file = source instanceof File ? source : new File([source], 'blob');
  const type = fileType || detectFileType(file);

  switch (type) {
    case 'image':
      return recognizeFromImage(file, onProgress);
    case 'pdf':
      return recognizeFromPdf(file);
    case 'word':
      return recognizeFromWord(file);
    case 'excel':
      return recognizeFromExcel(file);
    default: {
      // 尝试作为文本读取
      const text = await file.text();
      return parseTextContent(text);
    }
  }
}

// ========== 发货记录解析 ==========

/**
 * 从文本中解析发货记录
 * 支持格式:
 *   上海越联  PP-TD20  PM4-R04  1000  14.5
 *   金发科技  PA66-GF30  FR502  500  28.5  22
 *   表格行: 客户 | 材料 | 牌号 | 数量 | 售价 | 成本价
 */
export function parseShippingText(text: string): RecognizedShippingItem[] {
  const lines = text.split(/\n/);
  const items: RecognizedShippingItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) continue;

    // 跳过表头
    const headerKw = ['客户', '材料', '牌号', '数量', '售价', '成本', '序号', '合计'];
    if (headerKw.some(k => trimmed.includes(k))) continue;

    // 按分隔符拆分
    const parts = trimmed.split(/[\t|]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 1) {
      const spaceParts = trimmed.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
      if (spaceParts.length > 1) {
        items.push(...parseShippingParts([spaceParts]));
        continue;
      }
      continue;
    }
    items.push(...parseShippingParts([parts]));
  }

  return items;
}

function parseShippingParts(rows: string[][]): RecognizedShippingItem[] {
  const items: RecognizedShippingItem[] = [];
  for (const parts of rows) {
    if (parts.length < 2) continue;

    const usedIndices = new Set<number>();
    let customer = '';
    let material = '';
    let grade = '';
    let quantity = 0;
    let unitPrice = 0;
    let costPrice = 0;

    // 找日期
    let date = '';
    for (let i = 0; i < parts.length; i++) {
      if (/^\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}[日号]?$/.test(parts[i])) {
        date = parts[i].replace(/年/g, '-').replace(/月/g, '-').replace(/[日号]/g, '').replace(/\./g, '-').replace(/\//g, '-');
        usedIndices.add(i);
        break;
      }
    }

    // 找材料名
    for (let i = 0; i < parts.length; i++) {
      if (usedIndices.has(i)) continue;
      const upper = parts[i].toUpperCase();
      if (MATERIAL_KEYWORDS.some(k => upper.includes(k)) || /^[PABTSECR][A-Z0-9]*[-.]/.test(upper)) {
        material = parts[i];
        usedIndices.add(i);
        break;
      }
    }

    // 找数字 (数量和价格)
    const numbers: { index: number; value: number }[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (usedIndices.has(i)) continue;
      const numMatch = parts[i].match(/^(\d+\.?\d*)$/);
      if (numMatch) {
        numbers.push({ index: i, value: roundPrice(parseFloat(numMatch[1])) });
        usedIndices.add(i);
      }
    }

    // 分配数字: 数量通常较大(>=10), 售价次之, 成本价最小
    if (numbers.length >= 3) {
      numbers.sort((a, b) => b.value - a.value);
      quantity = numbers[0].value;
      unitPrice = numbers[1].value;
      costPrice = numbers[2].value;
    } else if (numbers.length === 2) {
      if (numbers[0].value >= numbers[1].value) {
        quantity = numbers[0].value;
        unitPrice = numbers[1].value;
      } else {
        quantity = numbers[1].value;
        unitPrice = numbers[0].value;
      }
    } else if (numbers.length === 1) {
      unitPrice = numbers[0].value;
    }

    // 剩余未使用的部分
    const remaining = parts.filter((_, i) => !usedIndices.has(i));
    if (!customer && remaining.length > 0) customer = remaining.shift() || '';
    if (!grade && remaining.length > 0) grade = remaining.shift() || '';

    if (customer || material || grade) {
      items.push({ customer, date, material, grade, quantity, unitPrice, costPrice });
    }
  }
  return items;
}

/**
 * 从Excel解析发货记录
 */
export async function recognizeShippingFromExcel(file: File | Blob): Promise<RecognizedShippingItem[]> {
  if (file instanceof File && file.size > MAX_FILE_SIZE) throw new Error('文件大小超过50MB限制');
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  const MAX_ROWS = 500;
  const effectiveRows = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;

  if (effectiveRows.length < 2) return [];

  const header = effectiveRows[0].map(h => String(h || '').trim().toLowerCase());
  const colMap: Record<string, number> = { customer: -1, date: -1, material: -1, grade: -1, quantity: -1, unitPrice: -1, costPrice: -1 };

  header.forEach((h, i) => {
    if (/客户|customer/.test(h)) colMap.customer = i;
    else if (/日期|date/.test(h)) colMap.date = i;
    else if (/材料|material|名称/.test(h)) colMap.material = i;
    else if (/牌号|grade|型号/.test(h)) colMap.grade = i;
    else if (/数量|quantity|qty/.test(h)) colMap.quantity = i;
    else if (/售价|单价|unitprice|price|报价/.test(h)) colMap.unitPrice = i;
    else if (/成本|cost/.test(h)) colMap.costPrice = i;
  });

  if (colMap.customer === -1 && colMap.material === -1) {
    // 按位置猜测
    colMap.customer = 0; colMap.material = 1; colMap.grade = 2;
    colMap.quantity = 3; colMap.unitPrice = 4; colMap.costPrice = 5;
    return parseShippingExcelRows(effectiveRows, colMap);
  }

  return parseShippingExcelRows(effectiveRows.slice(1), colMap);
}

function parseShippingExcelRows(rows: string[][], colMap: Record<string, number>): RecognizedShippingItem[] {
  const items: RecognizedShippingItem[] = [];
  for (const row of rows) {
    const customer = colMap.customer >= 0 ? String(row[colMap.customer] || '').trim() : '';
    const date = colMap.date >= 0 ? String(row[colMap.date] || '').trim() : '';
    const material = colMap.material >= 0 ? String(row[colMap.material] || '').trim() : '';
    const grade = colMap.grade >= 0 ? String(row[colMap.grade] || '').trim() : '';
    const quantityRaw = colMap.quantity >= 0 ? row[colMap.quantity] : 0;
    const unitPriceRaw = colMap.unitPrice >= 0 ? row[colMap.unitPrice] : 0;
    const costPriceRaw = colMap.costPrice >= 0 ? row[colMap.costPrice] : 0;

    const quantity = typeof quantityRaw === 'number' ? roundPrice(quantityRaw) : roundPrice(parseFloat(String(quantityRaw))) || 0;
    const unitPrice = typeof unitPriceRaw === 'number' ? roundPrice(unitPriceRaw) : roundPrice(parseFloat(String(unitPriceRaw))) || 0;
    const costPrice = typeof costPriceRaw === 'number' ? roundPrice(costPriceRaw) : roundPrice(parseFloat(String(costPriceRaw))) || 0;

    if (customer || material || grade) {
      items.push({ customer, date, material, grade, quantity, unitPrice, costPrice });
    }
  }
  return items;
}

/**
 * 统一发货记录识别入口
 */
export async function recognizeShippingContent(
  source: string | File | Blob,
  onProgress?: (progress: number) => void
): Promise<RecognizedShippingItem[]> {
  if (typeof source === 'string') {
    return parseShippingText(source);
  }
  const file = source instanceof File ? source : new File([source], 'blob');
  const type = detectFileType(file);

  // 先提取文本
  let text = '';
  switch (type) {
    case 'image': {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (info) => {
          if (info.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(info.progress * 100));
          } else if ((info.status === 'loading tesseract core' || info.status === 'loading language traineddata') && onProgress) {
            onProgress(Math.round(info.progress * 30));
          }
        },
      });
      text = result.data.text;
      break;
    }
    case 'pdf': {
      const items = await recognizeFromPdf(file);
      return items.map(i => ({ customer: '', date: '', material: i.material, grade: i.grade, quantity: 0, unitPrice: i.price, costPrice: 0 }));
    }
    case 'word': {
      const mammoth = await import('mammoth');
      const ab = await file.arrayBuffer();
      const r = await mammoth.extractRawText({ arrayBuffer: ab });
      text = r.value;
      break;
    }
    case 'excel':
      return recognizeShippingFromExcel(file);
    default: {
      text = await file.text();
    }
  }
  return parseShippingText(text);
}

// ========== 出行记录解析 ==========

/**
 * 从文本中解析出行记录
 * 支持格式:
 *   2026-06-14  上海  北京  553
 *   高铁  上海虹桥  北京南  553.5
 *   6月14日  济南  青岛  120
 */
export function parseTravelText(text: string): RecognizedTravelItem[] {
  const lines = text.split(/\n/);
  const items: RecognizedTravelItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) continue;

    const headerKw = ['日期', '出发', '目的', '金额', '公里', '序号', '合计'];
    if (headerKw.some(k => trimmed.includes(k))) continue;

    const parts = trimmed.split(/[\t|]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 1) {
      const spaceParts = trimmed.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
      if (spaceParts.length > 1) {
        const item = parseTravelParts(spaceParts);
        if (item) items.push(item);
        continue;
      }
      continue;
    }
    const item = parseTravelParts(parts);
    if (item) items.push(item);
  }

  return items;
}

function parseTravelParts(parts: string[]): RecognizedTravelItem | null {
  let date = '';
  let type = '高铁';
  let from = '';
  let to = '';
  let amount = 0;
  let km = 0;

  const usedIndices = new Set<number>();

  // 找出行类型
  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase();
    if (/高铁|动车|火车|g\d|d\d/.test(lower)) { type = '高铁'; usedIndices.add(i); break; }
    if (/飞机|航班|飞机|flight|ca\d|mu\d|cz\d/i.test(lower)) { type = '飞机'; usedIndices.add(i); break; }
    if (/打车|出租|滴滴|taxi/i.test(lower)) { type = '打车'; usedIndices.add(i); break; }
    if (/开车|自驾|驾车/i.test(lower)) { type = '开车'; usedIndices.add(i); break; }
  }

  // 找日期
  for (let i = 0; i < parts.length; i++) {
    if (usedIndices.has(i)) continue;
    if (/^\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}[日号]?$/.test(parts[i])) {
      date = parts[i].replace(/年/g, '-').replace(/月/g, '-').replace(/[日号]/g, '').replace(/\./g, '-').replace(/\//g, '-');
      usedIndices.add(i);
      break;
    }
    // 匹配 6月14日 格式
    const dateMatch = parts[i].match(/(\d{1,2})月(\d{1,2})[日号]/);
    if (dateMatch) {
      const now = new Date();
      date = `${now.getFullYear()}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      usedIndices.add(i);
      break;
    }
  }

  // 找金额
  const numberIndices: { index: number; value: number }[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (usedIndices.has(i)) continue;
    const numMatch = parts[i].match(/^(\d+\.?\d*)$/);
    if (numMatch) {
      numberIndices.push({ index: i, value: roundPrice(parseFloat(numMatch[1])) });
      usedIndices.add(i);
    }
  }

  // 分配数字: 金额和公里数
  if (numberIndices.length >= 2) {
    // 较大的可能是公里数，较小的是金额（或反之，看上下文）
    numberIndices.sort((a, b) => a.value - b.value);
    amount = numberIndices[0].value;
    km = numberIndices[numberIndices.length - 1].value;
    // 如果金额大于公里数，交换
    if (amount > km && km === 0) { amount = numberIndices[0].value; km = 0; }
  } else if (numberIndices.length === 1) {
    amount = numberIndices[0].value;
  }

  // 剩余部分: 出发地和目的地
  const remaining = parts.filter((_, i) => !usedIndices.has(i));
  if (remaining.length >= 2) {
    from = remaining[0];
    to = remaining[1];
  } else if (remaining.length === 1) {
    from = remaining[0];
  }

  if (from || to || amount > 0) {
    return { date, type, from, to, amount, km };
  }
  return null;
}

/**
 * 统一出行记录识别入口
 */
export async function recognizeTravelContent(
  source: string | File | Blob,
  onProgress?: (progress: number) => void
): Promise<RecognizedTravelItem[]> {
  if (typeof source === 'string') {
    return parseTravelText(source);
  }
  const file = source instanceof File ? source : new File([source], 'blob');
  const type = detectFileType(file);

  let text = '';
  switch (type) {
    case 'image': {
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (info) => {
          if (info.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(info.progress * 100));
          } else if ((info.status === 'loading tesseract core' || info.status === 'loading language traineddata') && onProgress) {
            onProgress(Math.round(info.progress * 30));
          }
        },
      });
      text = result.data.text;
      break;
    }
    case 'pdf': {
      const pdfjsLib = await loadPdfjs();
      const ab = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      const textParts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        textParts.push(content.items.map((item: TextItem) => item.str).join(' '));
      }
      text = textParts.join('\n');
      break;
    }
    case 'word': {
      const mammoth = await import('mammoth');
      const ab = await file.arrayBuffer();
      const r = await mammoth.extractRawText({ arrayBuffer: ab });
      text = r.value;
      break;
    }
    case 'excel': {
      if (file instanceof File && file.size > MAX_FILE_SIZE) throw new Error('文件大小超过50MB限制');
      const XLSX = await import('xlsx');
      const ab = await file.arrayBuffer();
      const workbook = XLSX.read(ab, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const MAX_ROWS = 500;
      const effectiveRows = rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;
      if (effectiveRows.length < 2) return [];
      const header = effectiveRows[0].map(h => String(h || '').trim().toLowerCase());
      const colMap: Record<string, number> = { date: -1, type: -1, from: -1, to: -1, amount: -1, km: -1 };
      header.forEach((h, i) => {
        if (/日期|date/.test(h)) colMap.date = i;
        else if (/类型|type|方式/.test(h)) colMap.type = i;
        else if (/出发|from|始发/.test(h)) colMap.from = i;
        else if (/目的|to|到达|终到/.test(h)) colMap.to = i;
        else if (/金额|amount|费用|花费|票价/.test(h)) colMap.amount = i;
        else if (/公里|km|里程|距离/.test(h)) colMap.km = i;
      });
      return effectiveRows.slice(1).map(row => {
        const date = colMap.date >= 0 ? String(row[colMap.date] || '') : '';
        const travelType = colMap.type >= 0 ? String(row[colMap.type] || '高铁') : '高铁';
        const from = colMap.from >= 0 ? String(row[colMap.from] || '') : '';
        const to = colMap.to >= 0 ? String(row[colMap.to] || '') : '';
        const amountRaw = colMap.amount >= 0 ? row[colMap.amount] : 0;
        const kmRaw = colMap.km >= 0 ? row[colMap.km] : 0;
        return {
          date, type: travelType, from, to,
          amount: typeof amountRaw === 'number' ? roundPrice(amountRaw) : roundPrice(parseFloat(String(amountRaw))) || 0,
          km: typeof kmRaw === 'number' ? roundPrice(kmRaw) : roundPrice(parseFloat(String(kmRaw))) || 0,
        };
      }).filter(r => r.from || r.to || r.amount > 0);
    }
    default: {
      text = await file.text();
    }
  }
  return parseTravelText(text);
}
