﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { isTauri, saveFile } from '../lib/tauri-files';
import { escapeHtml, formatDateCN, downloadBlob } from '../lib/utils';
import { DEFAULTS } from '@/config/defaults';

interface QuotationExportData {
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
  items: { material: string; grade: string; price: number; remark: string }[];
  greeting?: string;
  footerContact?: string;
  footerCompany?: string;
  closing?: string;
}

// ========== HTML 转 PDF 通用辅助函数 ==========

export async function renderHtmlToPdf(htmlContent: string, filename: string) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#fff';
  document.body.appendChild(container);

  await document.fonts.ready;

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  document.body.removeChild(container);

  if (isTauri()) {
    const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
    const ext = filename.split('.').pop() || 'pdf';
    await saveFile(new Uint8Array(arrayBuffer), filename, [
      { name: 'PDF 文件', extensions: [ext] }
    ]);
  } else {
    // v8 修复：Capacitor 环境使用 saveFile 走 Share 分享，非 Tauri 非 Capacitor 才用浏览器下载
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
      await saveFile(new Uint8Array(arrayBuffer), filename);
    } else {
      doc.save(filename);
    }
  }
}

export async function renderHtmlPagesToPdf(pagesHtml: string[], filename: string) {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;

  for (let i = 0; i < pagesHtml.length; i++) {
    if (i > 0) doc.addPage();

    const container = document.createElement('div');
    container.innerHTML = pagesHtml[i];
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = '#fff';
    document.body.appendChild(container);

    await document.fonts.ready;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);

    document.body.removeChild(container);
  }

  if (isTauri()) {
    const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
    const ext = filename.split('.').pop() || 'pdf';
    await saveFile(new Uint8Array(arrayBuffer), filename, [
      { name: 'PDF 文件', extensions: [ext] }
    ]);
  } else {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
      await saveFile(new Uint8Array(arrayBuffer), filename);
    } else {
      doc.save(filename);
    }
  }
}

// ========== DOCX 导出 ==========
export async function exportQuotationDocx(data: QuotationExportData) {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle } = await import('docx');
  const font12 = { size: 24, font: '宋体' }; // 12pt = 24 half-points
  const font10_5 = { size: 21, font: '宋体' }; // 10.5pt
  const font10_5_bold = { size: 21, font: '宋体', bold: true };

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  };

  // 表格1：收件信息表
  const infoTable = new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: `收件单位（Company）：${data.company}`, ...font12 })] })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: '发件人(From)：', ...font12 }), new TextRun({ text: data.sender, ...font12 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: `收件人（To）：${data.recipient}`, ...font12 })] })],
          }),
          new TableCell({
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: `日期(Date)：${formatDateCN(data.date)}`, ...font12 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: '传真号(Fax No)：', ...font12 })] })],
          }),
          new TableCell({
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: '页数(Page-Inc this one)：', ...font12 }), new TextRun({ text: '1', ...font12 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: '主题(Subject)： 材料报价', ...font12 })] })],
          }),
          new TableCell({
            borders: cellBorder,
            children: [new Paragraph({ children: [new TextRun({ text: '抄送（CC）：', ...font12 })] })],
          }),
        ],
      }),
    ],
  });

  // 表格2：材料报价表
  const materialRows = [
    new TableRow({
      children: ['材料名称', '牌号', '价格（元/kg）', '备注'].map(text =>
        new TableCell({
          borders: cellBorder,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, ...font10_5_bold })] })],
        })
      ),
    }),
    ...data.items.map(item =>
      new TableRow({
        children: [
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.material, ...font10_5 })] })] }),
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.grade, ...font10_5 })] })] }),
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.price), ...font10_5 })] })] }),
          new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.remark || '', ...font10_5 })] })] }),
        ],
      })
    ),
  ];

  const materialTable = new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: materialRows,
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 612775, bottom: 914400, left: 603250, right: 382270 },
        },
      },
      children: [
        // 传真标记行
        new Paragraph({
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
        }),
        // 您好
        new Paragraph({
          children: [
            new TextRun({ text: '  您好', ...font12 }),
            new TextRun({ text: '！', ...font12, bold: true }),
          ],
        }),
        // 正文
        new Paragraph({
          children: [new TextRun({ text: data.greeting || DEFAULTS.quotation.greeting, ...font12 })],
        }),
        new Paragraph({ children: [] }),
        // 收件信息表
        infoTable,
        // 材料报价表
        materialTable,
        // 有效期
        new Paragraph({
          children: [new TextRun({ text: `有效期：${formatDateCN(data.validFrom)}-${formatDateCN(data.validTo)}`, ...font12 })],
        }),
        // MOQ和备注
        new Paragraph({
          children: [new TextRun({ text: `MOQ:${data.moq}KG备注： ${data.note ? `(${data.note})` : ''}`, ...font12 })],
        }),
        // 联系方式
        new Paragraph({
          children: [new TextRun({ text: data.footerContact || '如有疑问，敬请来电垂询。', ...font12 })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `联系电话：${data.sender}${data.phone}`, ...font12 })],
        }),
        // 顺祝商祺
        ...(() => {
          const closingText = data.closing || DEFAULTS.quotation.closing;
          const lines = closingText.split('\n');
          return lines.map((line, idx) => {
            if (idx === 0) {
              return new Paragraph({
                children: [new TextRun({ text: '                ' + line, ...font12 })],
              });
            }
            return new Paragraph({
              children: [new TextRun({ text: line, ...font12 })],
            });
          });
        })(),
        // 公司名
        new Paragraph({
          children: [new TextRun({ text: '   ' + (data.footerCompany || DEFAULTS.quotation.footerCompany), ...font12, bold: true })],
        }),
        // 日期
        new Paragraph({
          children: [new TextRun({ text: `                                                                    ${data.date.replace(/-/g, '/')}`, ...font12 })],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  await downloadBlob(blob, `${data.title}-${data.date}.docx`);
}

// ========== PDF 导出（使用 html2canvas 解决中文乱码）==========
export async function exportQuotationPdf(data: QuotationExportData) {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${escapeHtml(item.material)}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;font-family:monospace;">${escapeHtml(item.grade)}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${item.price}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${escapeHtml(item.remark || '')}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:'宋体','SimSun','Microsoft YaHei',serif;font-size:12pt;line-height:1.8;padding:20px;color:#000;background:#fff;width:754px;box-sizing:border-box;">
      <div style="font-size:10.5pt;margin-bottom:8px;">紧急&nbsp;&nbsp;&nbsp;&nbsp;请审阅&nbsp;&nbsp;&nbsp;&nbsp;请批注&nbsp;&nbsp;&nbsp;&nbsp;请答复&nbsp;&nbsp;&nbsp;&nbsp;请传阅&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">★如不清晰烦请电告</span></div>
      <div style="margin-bottom:8px;">&nbsp;&nbsp;您好！</div>
      <div style="margin-bottom:8px;">${escapeHtml(data.greeting || '首先感谢您的信任与配合！ 对于贵司所需的工程塑料材料，我公司当前报价（含税）为：')}</div>
      <div style="height:12px;"></div>
      <table style="width:100%;border-collapse:collapse;font-size:12pt;margin-bottom:12px;">
        <tr><td style="border:1px solid #000;padding:6px;width:50%;">收件单位（Company）：${escapeHtml(data.company)}</td><td style="border:1px solid #000;padding:6px;">发件人(From)：${escapeHtml(data.sender)}</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">收件人（To）：${escapeHtml(data.recipient)}</td><td style="border:1px solid #000;padding:6px;">日期(Date)：${formatDateCN(data.date)}</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">传真号(Fax No)：</td><td style="border:1px solid #000;padding:6px;">页数(Page-Inc this one)：1</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">主题(Subject)： 材料报价</td><td style="border:1px solid #000;padding:6px;">抄送（CC）：</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">材料名称</th>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">牌号</th>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">价格（元/kg）</th>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">备注</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-bottom:6px;">有效期：${formatDateCN(data.validFrom)}-${formatDateCN(data.validTo)}</div>
      <div style="margin-bottom:6px;">MOQ:${data.moq}KG备注：${data.note ? `(${escapeHtml(data.note)})` : ''}</div>
      <div style="margin-bottom:6px;">${escapeHtml(data.footerContact || DEFAULTS.quotation.footerContact)}</div>
      <div style="margin-bottom:16px;">联系电话：${escapeHtml(data.sender)}${escapeHtml(data.phone)}</div>
      ${(data.closing || DEFAULTS.quotation.closing).split('\n').map((line, i) => `<div style="margin-bottom:${i === 0 ? '6px' : '16px'};">${i === 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${escapeHtml(line)}</div>`).join('')}
      <div style="font-weight:bold;margin-bottom:6px;">&nbsp;&nbsp;&nbsp;${escapeHtml(data.footerCompany || DEFAULTS.quotation.footerCompany)}</div>
      <div style="text-align:right;">${data.date.replace(/-/g, '/')}</div>
    </div>
  `;

  await renderHtmlToPdf(html, `${data.title}-${data.date}.pdf`);
}

// 报价记录PDF导出辅助函数：生成单页HTML
export function generateRecordPageHtml(
  customer: string,
  groupRecords: { material: string; grade: string; unitPrice: number; status: string }[],
  dateStr: string,
  validFrom: string,
  validTo: string,
  moq: number,
  note: string,
  sender: string,
  phone: string,
  rawDate: string,
  totalAmt: number,
  greeting?: string,
  footerContact?: string,
  footerCompany?: string,
  closing?: string
): string {
  const itemsHtml = groupRecords.map(r => `
    <tr>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${escapeHtml(r.material)}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;font-family:monospace;">${escapeHtml(r.grade)}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${r.unitPrice}</td>
      <td style="border:1px solid #000;padding:6px;text-align:center;">${escapeHtml(r.status)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:'宋体','SimSun','Microsoft YaHei',serif;font-size:12pt;line-height:1.8;padding:20px;color:#000;background:#fff;width:754px;box-sizing:border-box;">
      <div style="font-size:10.5pt;margin-bottom:8px;">紧急&nbsp;&nbsp;&nbsp;&nbsp;请审阅&nbsp;&nbsp;&nbsp;&nbsp;请批注&nbsp;&nbsp;&nbsp;&nbsp;请答复&nbsp;&nbsp;&nbsp;&nbsp;请传阅&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:bold;">★如不清晰烦请电告</span></div>
      <div style="margin-bottom:8px;">&nbsp;&nbsp;您好！</div>
      <div style="margin-bottom:8px;">${escapeHtml(greeting || '首先感谢您的信任与配合！ 对于贵司所需的工程塑料材料，我公司当前报价（含税）为：')}</div>
      <div style="height:12px;"></div>
      <table style="width:100%;border-collapse:collapse;font-size:12pt;margin-bottom:12px;">
        <tr><td style="border:1px solid #000;padding:6px;width:50%;">收件单位（Company）：${escapeHtml(customer)}</td><td style="border:1px solid #000;padding:6px;">发件人(From)：${escapeHtml(sender)}</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">收件人（To）：</td><td style="border:1px solid #000;padding:6px;">日期(Date)：${dateStr}</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">传真号(Fax No)：</td><td style="border:1px solid #000;padding:6px;">页数(Page-Inc this one)：1</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">主题(Subject)： 材料报价</td><td style="border:1px solid #000;padding:6px;">抄送（CC）：</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-bottom:16px;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">材料名称</th>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">牌号</th>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">价格（元/kg）</th>
            <th style="border:1px solid #000;padding:6px;text-align:center;font-weight:bold;">备注</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-bottom:6px;">有效期：${validFrom}-${validTo}</div>
      <div style="margin-bottom:6px;">MOQ:${moq != null ? `${moq}KG` : 'N/A'}备注：${note ? `(${escapeHtml(note)})` : `合计金额¥${totalAmt.toFixed(2)}`}</div>
      <div style="margin-bottom:6px;">${escapeHtml(footerContact || DEFAULTS.quotation.footerContact)}</div>
      <div style="margin-bottom:16px;">联系电话：${escapeHtml(sender)}${escapeHtml(phone)}</div>
      ${(closing || DEFAULTS.quotation.closing).split('\n').map((line, i) => `<div style="margin-bottom:${i === 0 ? '6px' : '16px'};">${i === 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : ''}${escapeHtml(line)}</div>`).join('')}
      <div style="font-weight:bold;margin-bottom:6px;">&nbsp;&nbsp;&nbsp;${escapeHtml(footerCompany || DEFAULTS.quotation.footerCompany)}</div>
      <div style="text-align:right;">${rawDate.replace(/-/g, '/')}</div>
    </div>
  `;
}

export { downloadBlob } from '../lib/utils';
