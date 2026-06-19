﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { escapeHtml, escapeXml, escapeMd, downloadBlob } from '../lib/utils';

export interface ExportColumn<T> {
  key: keyof T & string;
  label: string;
  format?: (value: T[keyof T], row: T) => string;
  align?: 'left' | 'right' | 'center';
  isNumeric?: boolean;
}

export interface ExportOptions<T> {
  columns: ExportColumn<T>[];
  filename: string;
  title: string;
}

function getCellValue<T>(row: T, col: ExportColumn<T>): string {
  const raw = row[col.key];
  if (col.format) return col.format(raw, row);
  return String(raw ?? '');
}

export function createExporter<T>(options: ExportOptions<T>) {
  const { columns, filename, title } = options;

  return {
    async csv(data: T[]) {
      const BOM = '\uFEFF';
      const header = columns.map(c => c.label).join(',') + '\n';
      const rows = data.map(row => columns.map(c => {
        const val = getCellValue(row, c);
        return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')).join('\n');
      await downloadBlob(new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
    },

    async tsv(data: T[]) {
      const BOM = '\uFEFF';
      const header = columns.map(c => c.label).join('\t') + '\n';
      const rows = data.map(row => columns.map(c => getCellValue(row, c)).join('\t')).join('\n');
      await downloadBlob(new Blob([BOM + header + rows], { type: 'text/tab-separated-values;charset=utf-8' }), `${filename}.tsv`);
    },

    async json(data: T[]) {
      const exportData = data.map(row => {
        const obj: Record<string, unknown> = {};
        columns.forEach(c => { obj[c.label] = row[c.key]; });
        return obj;
      });
      await downloadBlob(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' }), `${filename}.json`);
    },

    async html(data: T[]) {
      const totals: Record<string, number> = {};
      columns.forEach(c => { if (c.isNumeric) totals[c.key as string] = 0; });
      data.forEach(row => {
        columns.forEach(c => {
          if (c.isNumeric && typeof row[c.key] === 'number') {
            totals[c.key as string] = (totals[c.key as string] || 0) + (row[c.key] as number);
          }
        });
      });

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:"Microsoft YaHei",sans-serif;padding:20px}h1{text-align:center;color:#333}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:8px 12px;text-align:center}th{background:#f5f5f5;font-weight:bold}tfoot td{font-weight:bold;background:#fff8e1}.num{text-align:right}.positive{color:#059669}.negative{color:#DC2626}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${data.map(row => `<tr>${columns.map(c => {
        const val = getCellValue(row, c);
        const align = c.align || (c.isNumeric ? 'right' : 'left');
        return `<td class="${align === 'right' ? 'num' : ''}">${c.isNumeric ? val : escapeHtml(val)}</td>`;
      }).join('')}</tr>`).join('\n')}</tbody>${Object.keys(totals).length > 0 ? `<tfoot><tr><td>合计</td>${columns.slice(1).map(c => c.isNumeric ? `<td class="num">${totals[c.key as string] !== undefined ? totals[c.key as string] : ''}</td>` : '<td></td>').join('')}</tr></tfoot>` : ''}</table></body></html>`;
      await downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${filename}.html`);
    },

    async xml(data: T[]) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${title}>\n${data.map(row => `  <记录>${columns.map(c => `<${c.label}>${c.isNumeric ? getCellValue(row, c) : escapeXml(getCellValue(row, c))}</${c.label}>`).join('')}</记录>`).join('\n')}\n</${title}>`;
      await downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8' }), `${filename}.xml`);
    },

    async md(data: T[]) {
      let md = `# ${title}\n\n| ${columns.map(c => c.label).join(' | ')} |\n| ${columns.map(c => c.align === 'right' ? '---:' : '---').join(' | ')} |\n`;
      data.forEach(row => { md += `| ${columns.map(c => escapeMd(getCellValue(row, c))).join(' | ')} |\n`; });
      await downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${filename}.md`);
    },
  };
}
