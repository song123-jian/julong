﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useRef } from 'react';
import { Sparkles, Upload, Loader2, X, Plus, Trash2 } from 'lucide-react';
import { useRecognizer } from '../hooks/useRecognizer';

export interface RecognizerColumn<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'number';
  className?: string;
}

interface RecognizerPanelProps<T> {
  /** 是否显示面板 */
  show: boolean;
  /** 显示/隐藏切换 */
  onToggle: () => void;
  /** 列定义 */
  columns: RecognizerColumn<T>[];
  /** 文本识别回调 */
  onRecognizeText: (text: string) => Promise<T[]>;
  /** 文件识别回调 */
  onRecognizeFile: (file: File, onProgress?: (p: number) => void) => Promise<T[]>;
  /** 应用识别结果 */
  onApply: (items: T[]) => void;
  /** 应用按钮文本 */
  applyLabel?: string;
  /** 应用按钮说明 */
  applyHint?: string;
  /** textarea placeholder */
  placeholder?: string;
  /** textarea id */
  textareaId?: string;
  /** 文件上传 accept */
  accept?: string;
}

export function RecognizerPanel<T>({
  show, onToggle, columns, onRecognizeText, onRecognizeFile,
  onApply, applyLabel = '应用识别结果', applyHint = '',
  placeholder = '粘贴内容，Ctrl+Enter 快捷识别',
  textareaId, accept = 'image/*,.pdf,.docx,.doc,.xlsx,.xls,.csv',
}: RecognizerPanelProps<T>) {
  const recognizer = useRecognizer<T>();
  const textRef = useRef<HTMLTextAreaElement>(null);

  if (!show) return null;

  const handleApply = () => {
    if (recognizer.items.length === 0) return;
    onApply(recognizer.items);
    recognizer.reset();
    onToggle();
  };

  return (
    <div className="border border-[#F59E0B]/30 rounded-xl bg-[#FFFBEB]/50 p-3 md:p-4 shadow-sm max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-[#92400E] flex items-center gap-1.5"><Sparkles size={14} /> 智能识别 - 粘贴文本或上传文件</h4>
        <button onClick={() => { recognizer.reset(); onToggle(); }} className="p-1 text-[#6C757B] hover:text-[#DC2626] transition-colors"><X size={16} /></button>
      </div>
      <textarea
        id={textareaId}
        ref={textRef}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#F59E0B] rounded-lg resize-none mb-3"
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); if (textRef.current) recognizer.recognizeText(textRef.current.value, onRecognizeText); } }}
      />
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={() => { if (textRef.current) recognizer.recognizeText(textRef.current.value, onRecognizeText); }} disabled={recognizer.status === 'recognizing' || recognizer.status === 'loading'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Sparkles size={12} /> 识别文本</button>
        <span className="text-[10px] text-[#6C757B]">Ctrl+Enter 快捷识别</span>
        <div className="flex-1" />
        <input ref={recognizer.fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => recognizer.recognizeFile(e.target.files, onRecognizeFile)} />
        <button onClick={() => recognizer.fileRef.current?.click()} disabled={recognizer.status === 'loading'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/5 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"><Upload size={12} /> 上传文件</button>
        <span className="text-[10px] text-[#6C757B]">支持图片/PDF/Word/Excel</span>
      </div>
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
      {recognizer.error && (
        <div className="mb-3 p-2 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg text-xs text-[#DC2626]">{recognizer.error}</div>
      )}
      {recognizer.items.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-[#6C757B] mb-2">识别结果（{recognizer.items.length}条，可编辑修正）</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: `${columns.length * 100 + 40}px` }}>
              <thead><tr className="bg-[#FEF3C7]">
                {columns.map(col => (
                  <th key={col.key} className={`text-left text-[#92400E] font-medium text-xs p-2 ${col.className || ''}`}>{col.label}</th>
                ))}
                <th className="w-10"></th>
              </tr></thead>
              <tbody>
                {recognizer.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#E2E8F0]/60">
                    {columns.map(col => (
                      <td key={col.key} className="p-2">
                        {col.type === 'number' ? (
                          <input type="number" value={(item[col.key] as number) || ''} onChange={e => recognizer.updateItem(idx, { [col.key]: parseFloat(e.target.value) || 0 } as Partial<T>)} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1 text-xs font-mono text-right focus:outline-none focus:border-[#F59E0B] rounded" />
                        ) : (
                          <input value={String(item[col.key] || '')} onChange={e => recognizer.updateItem(idx, { [col.key]: e.target.value } as Partial<T>)} className="w-full bg-white border border-[#E2E8F0] text-[#1A1A2E] p-1 text-xs focus:outline-none focus:border-[#F59E0B] rounded" />
                        )}
                      </td>
                    ))}
                    <td className="p-2 text-center"><button onClick={() => recognizer.removeItem(idx)} className="p-1 text-[#6C757B] hover:text-[#DC2626] transition-colors"><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={handleApply} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"><Plus size={12} /> {applyLabel}</button>
            {applyHint && <span className="text-[10px] text-[#6C757B]">{applyHint}</span>}
          </div>
        </div>
      )}
      {recognizer.status === 'done' && recognizer.items.length === 0 && (
        <div className="p-3 bg-gray-50 rounded-lg text-xs text-[#6C757B] text-center">未识别到有效内容，请检查格式或手动输入</div>
      )}
    </div>
  );
}
