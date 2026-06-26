﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useRef } from 'react';
import { parseBatchCode, BatchParseResult } from '@/utils/batch';
import { BATCH_CODES, TEST_CODES, BATCH_FORMAT } from '@/utils/rules';
import { recognizeContent, type RecognizeStatus } from '../utils/contentRecognizer';
import { Copy, RotateCcw, AlertTriangle, CheckCircle, Hash, Sparkles, Upload, Loader2, X } from 'lucide-react';
import { copyText } from '@/lib/utils';

const SEGMENT_COLORS = ['#D97706', '#0D9488', '#DC2626', '#7C3AED', '#059669'];

export default function Batch() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<BatchParseResult | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchResults, setBatchResults] = useState<BatchParseResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [showRecognizer, setShowRecognizer] = useState(false);
  const [recognizeStatus, setRecognizeStatus] = useState<RecognizeStatus>('idle');
  const [recognizeProgress, setRecognizeProgress] = useState(0);
  const [recognizeError, setRecognizeError] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const [genCategory, setGenCategory] = useState('T');
  const [genYear, setGenYear] = useState(new Date().getFullYear().toString().slice(-2));
  const [genSeq, setGenSeq] = useState('');
  const [genBatchId, setGenBatchId] = useState('');
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('batch_history');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    const r = parseBatchCode(input);
    setResult(r);
    if (input.trim() && r.type !== 'unknown') {
      setHistory(prev => {
        const next = [input.trim().toUpperCase(), ...prev.filter(h => h !== input.trim().toUpperCase())].slice(0, 20);
        localStorage.setItem('batch_history', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleGenerateBatch = () => {
    const code = `${genCategory}${genYear}${genSeq}${genBatchId}`;
    setInput(code);
    setResult(parseBatchCode(code));
    setShowGenerator(false);
  };

  const handleBatchParse = () => {
    const lines = batchInput.split(/[\n,;，；]/).map(l => l.trim()).filter(Boolean);
    setBatchResults(lines.map(line => parseBatchCode(line)));
  };

  const handleCopy = async (text: string) => {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTable = async () => {
    if (!result) return;
    const header = '| 字段 | 值 | 含义 |';
    const sep = '| --- | --- | --- |';
    const rows = result.segments.map(s => `| ${s.label} | ${s.value} | ${s.meaning} |`).join('\n');
    const md = `## ${result.fullCode} 解析结果\n\n${header}\n${sep}\n${rows}`;
    await copyText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setInput('');
    setBatchInput('');
    setResult(null);
    setBatchResults([]);
  };

  const handleRecognizeBatchFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setRecognizeStatus('loading');
    setRecognizeError('');
    try {
      const file = files[0];
      if (file.size > 50 * 1024 * 1024) {
        setRecognizeError('文件超过50MB限制');
        setRecognizeStatus('error');
        return;
      }
      const items = await recognizeContent(file, undefined, (p) => setRecognizeProgress(p));
      const codes = items.map(i => i.grade || i.material || i.remark).filter(Boolean);
      if (codes.length > 0) {
        if (batchMode) {
          setBatchInput(codes.join('\n'));
        } else {
          setInput(codes[0]);
        }
      }
      setShowRecognizer(false);
      setRecognizeStatus('idle');
      setRecognizeProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: unknown) {
      setRecognizeError(e instanceof Error ? e.message : '文件识别失败');
      setRecognizeStatus('error');
    }
  };

  const typeLabels: Record<string, string> = {
    production: '生产批次号',
    test: '试验品批次号',
    unknown: '未知类型',
  };

  const typeColors: Record<string, string> = {
    production: '#0D9488',
    test: '#DC2626',
    unknown: '#6C757B',
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#059669] to-[#0D9488] rounded-lg shadow-md">
            <Hash size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">批次号解析</h2>
            <p className="text-xs text-[#6C757B] mt-0.5">解析生产批次号与试验品批次号</p>
          </div>
        </div>
        <button
          onClick={() => { setBatchMode(!batchMode); setResult(null); setBatchResults([]); }}
          className={`px-4 py-2 text-sm border rounded-lg transition-all duration-200 ${
            batchMode
              ? 'border-[#D97706] text-[#D97706] bg-[#D97706]/5'
              : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#059669]/40'
          }`}
        >
          {batchMode ? '单条模式' : '批量模式'}
        </button>
      </div>

      {/* 批次号生成器 */}
      <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#059669]" />
            <span className="text-sm font-bold text-[#1A1A2E]">批次号生成器</span>
          </div>
          <span className="text-xs text-[#6C757B]">{showGenerator ? '收起' : '展开'}</span>
        </button>
        {showGenerator && (
          <div className="p-4 pt-0 space-y-3 border-t border-[#E2E8F0]/60">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-[#6C757B] mb-1 block">产品类别</label>
                <select value={genCategory} onChange={e => setGenCategory(e.target.value)} className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm focus:outline-none focus:border-[#059669] rounded-lg">
                  {Object.entries(BATCH_CODES).map(([code, name]) => (
                    <option key={code} value={code}>{code} - {name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#6C757B] mb-1 block">年号(后两位)</label>
                <input value={genYear} onChange={e => setGenYear(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="25" maxLength={2} className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#059669] rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-[#6C757B] mb-1 block">生产顺序号</label>
                <input value={genSeq} onChange={e => setGenSeq(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="00190" maxLength={5} className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#059669] rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-[#6C757B] mb-1 block">批次识别码(可选)</label>
                <input value={genBatchId} onChange={e => setGenBatchId(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="01" maxLength={2} className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2 text-sm font-mono focus:outline-none focus:border-[#059669] rounded-lg" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-sm font-mono text-[#059669] bg-[#059669]/5 px-3 py-2 rounded-lg">
                预览: {genCategory}{genYear}{genSeq}{genBatchId}
              </div>
              <button onClick={handleGenerateBatch} disabled={!genSeq} className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#0D9488] text-white font-bold text-sm rounded-lg hover:shadow-lg transition-all disabled:opacity-30">
                生成并解析
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#059669] via-[#D97706] to-transparent" />
        <label className="text-sm text-[#6C757B] mb-2 block font-medium">
          {batchMode ? '输入多个批次号（换行/逗号/分号分隔）' : '输入批次号'}
        </label>
        {batchMode ? (
          <textarea
            value={batchInput}
            onChange={e => setBatchInput(e.target.value)}
            placeholder={'T180013901\nB180023502\nTX1800139'}
            className="w-full h-32 bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-3 text-sm font-mono focus:outline-none focus:border-[#059669] resize-none rounded-lg"
          />
        ) : (
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleParse()}
            placeholder="例如: T180013901"
            className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-3 text-lg font-mono focus:outline-none focus:border-[#059669] rounded-lg"
          />
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={batchMode ? handleBatchParse : handleParse}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-[#D97706]/20 transition-all duration-300 hover:-translate-y-0.5"
          >
            解析
          </button>
          <button onClick={() => setShowRecognizer(!showRecognizer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${showRecognizer ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/5' : 'border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/5'}`}
          >
            <Sparkles size={12} /> 智能识别
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 border border-[#E2E8F0] text-[#6C757B] text-sm hover:text-[#1A1A2E] hover:border-[#6C757B] transition-all duration-200 rounded-lg flex items-center gap-2"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
        {showRecognizer && (
          <div className="mt-2 border border-[#F59E0B]/30 rounded-lg bg-[#FFFBEB]/50 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#92400E] flex items-center gap-1"><Sparkles size={11} /> 从图片/文件识别批次号</span>
              <button onClick={() => { setShowRecognizer(false); setRecognizeStatus('idle'); setRecognizeError(''); }} className="p-0.5 text-[#6C757B] hover:text-[#DC2626] transition-colors"><X size={12} /></button>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.docx,.xlsx" className="hidden" onChange={e => handleRecognizeBatchFile(e.target.files)} />
              <button onClick={() => fileInputRef.current?.click()} disabled={recognizeStatus === 'loading'} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#F59E0B] text-white rounded hover:bg-[#D97706] transition-colors disabled:opacity-50"><Upload size={11} /> 上传图片/文件</button>
              <span className="text-[10px] text-[#6C757B]">识别后自动填入输入框</span>
            </div>
            {(recognizeStatus === 'loading' || recognizeStatus === 'recognizing') && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[#92400E]"><Loader2 size={10} className="animate-spin" /> {recognizeStatus === 'loading' ? '读取中...' : `识别中 ${recognizeProgress}%`}</div>
                <div className="w-full bg-[#FDE68A]/30 rounded-full h-1 mt-1"><div className="bg-[#F59E0B] h-1 rounded-full transition-all" style={{ width: `${recognizeProgress}%` }} /></div>
              </div>
            )}
            {recognizeError && <div className="mt-1.5 text-[10px] text-[#DC2626]">{recognizeError}</div>}
          </div>
        )}
      </div>

      {/* 历史记录 */}
      {history.length > 0 && !result && !batchMode && (
        <div className="border border-[#E2E8F0] bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6C757B]">最近解析</span>
            <button onClick={() => { setHistory([]); localStorage.removeItem('batch_history'); }} className="text-[11px] text-[#DC2626] hover:underline">清空</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setInput(h); setResult(parseBatchCode(h)); }}
                className="px-2 py-1 text-xs font-mono border border-[#E2E8F0] text-[#1A1A2E] hover:border-[#059669] hover:text-[#059669] rounded-md transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 单条解析结果 */}
      {result && !batchMode && (
        <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#059669] via-transparent to-transparent" />
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span
                className="px-3 py-1 text-xs font-bold rounded-full"
                style={{ backgroundColor: `${typeColors[result.type]}15`, color: typeColors[result.type] }}
              >
                {typeLabels[result.type]}
              </span>
              <span className="text-[#1A1A2E] font-mono text-lg">{input.toUpperCase()}</span>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(result.segments.map(s => `${s.label}: ${s.meaning}`), null, 2))}
              className="flex items-center gap-1 text-xs text-[#6C757B] hover:text-[#D97706] transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-[#D97706]/30 hover:bg-[#D97706]/5"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制结果'}
            </button>
            <button
              onClick={handleCopyTable}
              className="flex items-center gap-1 text-xs text-[#6C757B] hover:text-[#059669] transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-[#059669]/30 hover:bg-[#059669]/5"
            >
              <Copy size={14} /> 复制表格
            </button>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-4 space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#DC2626] bg-[#DC2626]/5 px-3 py-2 rounded-lg">
                  <AlertTriangle size={12} /> {w}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {result.segments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 border-l-2 bg-gray-50/80 rounded-r-lg transition-all duration-200 hover:bg-gray-50"
                style={{ borderColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0 rounded-md"
                  style={{
                    backgroundColor: `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}15`,
                    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                  }}
                >
                  {seg.position}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6C757B]">{seg.label}</p>
                  <p className="text-sm text-[#1A1A2E] font-bold">{seg.meaning}</p>
                </div>
                <span className="font-mono text-sm" style={{ color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}>{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 批量解析结果 */}
      {batchMode && batchResults.length > 0 && (
        <div className="space-y-3">
          {batchResults.map((r, i) => (
            <div key={i} className="border border-[#E2E8F0] bg-white p-4 rounded-xl card-hover shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-mono font-bold text-[#1A1A2E]">{r.fullCode}</span>
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded-full"
                  style={{ backgroundColor: `${typeColors[r.type]}15`, color: typeColors[r.type] }}
                >
                  {typeLabels[r.type]}
                </span>
              </div>
              {r.warnings.length > 0 && (
                <div className="mb-2 space-y-1">
                  {r.warnings.map((w, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-[#DC2626]">
                      <AlertTriangle size={12} /> {w}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {r.segments.map((seg, j) => (
                  <span
                    key={j}
                    className="px-2 py-1 text-xs border rounded-md"
                    style={{
                      borderColor: `${SEGMENT_COLORS[j % SEGMENT_COLORS.length]}40`,
                      color: SEGMENT_COLORS[j % SEGMENT_COLORS.length],
                      backgroundColor: `${SEGMENT_COLORS[j % SEGMENT_COLORS.length]}08`,
                    }}
                  >
                    {seg.label}: {seg.meaning}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 批次号格式参考 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#059669] to-[#0D9488] rounded-full" />
          批次号格式参考
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
            <h4 className="text-sm font-bold text-[#0D9488] mb-2">生产批次号格式</h4>
            <p className="text-[#1A1A2E] text-sm mb-3">{BATCH_FORMAT.production}</p>
            <div className="space-y-1">
              {Object.entries(BATCH_FORMAT.structure).map(([key, desc]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-xs text-[#6C757B] shrink-0 w-16">{key.replace('_', '-')}</span>
                  <span className="text-xs text-[#1A1A2E]">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
            <h4 className="text-sm font-bold text-[#DC2626] mb-2">试验品批次号格式</h4>
            <p className="text-[#1A1A2E] text-sm">{BATCH_FORMAT.test}</p>
          </div>
        </div>
      </section>

      {/* 类别代码参考 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-[#D97706] mb-3">生产产品类别代码</h4>
          <div className="space-y-1">
            {Object.entries(BATCH_CODES).map(([code, name]) => (
              <div key={code} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                <span className="text-[#D97706] font-mono font-bold w-6">{code}</span>
                <span className="text-[#1A1A2E] text-sm">{name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-[#0D9488] mb-3">试验品类别代码</h4>
          <div className="space-y-1">
            {Object.entries(TEST_CODES).map(([code, name]) => (
              <div key={code} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                <span className="text-[#0D9488] font-mono font-bold w-6">{code}</span>
                <span className="text-[#1A1A2E] text-sm">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
