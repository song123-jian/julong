﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useRef, useEffect } from 'react';
import { parseCode, batchParse, ParseResult } from '@/utils/parser';
import { Copy, RotateCcw, AlertTriangle, CheckCircle, Search, Sparkles, Upload, Loader2, X } from 'lucide-react';
import { recognizeContent, type RecognizeStatus } from '../utils/contentRecognizer';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORY_CODES, MODIFIER_CODES, COLOR_CODES, APPLICATION_CODES, FLAME_RETARDANT_CODES } from '@/utils/rules';
import { copyText } from '@/lib/utils';

export default function Parser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<ParseResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [showRecognizer, setShowRecognizer] = useState(false);
  const [recognizeStatus, setRecognizeStatus] = useState<RecognizeStatus>('idle');
  const [recognizeProgress, setRecognizeProgress] = useState(0);
  const [recognizeError, setRecognizeError] = useState('');
  const [compareInput, setCompareInput] = useState('');
  const [compareResult, setCompareResult] = useState<{ code1: string; code2: string; diffs: { label: string; val1: string; val2: string; same: boolean }[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('parser_history');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setInput(q);
      setResult(parseCode(q));
    }
  }, [searchParams]);

  const handleParse = () => {
    if (batchMode) {
      setBatchResults(batchParse(input));
    } else {
      const r = parseCode(input);
      setResult(r);
      if (input.trim() && r.type !== 'unknown') {
        setHistory(prev => {
          const next = [input.trim().toUpperCase(), ...prev.filter(h => h !== input.trim().toUpperCase())].slice(0, 20);
          localStorage.setItem('parser_history', JSON.stringify(next));
          return next;
        });
      }
    }
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
    setResult(null);
    setBatchResults([]);
  };

  const handleRecognizeParserFile = async (files: FileList | null) => {
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
      const grades = items.map(i => i.grade || i.material).filter(Boolean);
      if (grades.length > 0) {
        if (batchMode) {
          setInput(grades.join('\n'));
        } else {
          setInput(grades[0]);
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

  const handleCompare = () => {
    const parts = compareInput.split(/[\s,，]+/).filter(Boolean);
    if (parts.length < 2) return;
    const r1 = parseCode(parts[0]);
    const r2 = parseCode(parts[1]);
    const allLabels = [...new Set([...r1.segments, ...r2.segments].map(s => s.label))];
    const diffs = allLabels.map(label => {
      const s1 = r1.segments.find(s => s.label === label);
      const s2 = r2.segments.find(s => s.label === label);
      return {
        label,
        val1: s1 ? `${s1.value} (${s1.meaning})` : '-',
        val2: s2 ? `${s2.value} (${s2.meaning})` : '-',
        same: s1 && s2 ? s1.value === s2.value : false,
      };
    });
    setCompareResult({ code1: parts[0].toUpperCase(), code2: parts[1].toUpperCase(), diffs });
  };

  const typeLabels: Record<string, string> = {
    standard: '标准牌号',
    alloy: '合金牌号',
    export: '核销牌号',
    foam: '发泡牌号',
    longFiber: '长玻纤牌号',
    unknown: '未知类型',
  };

  const typeColors: Record<string, string> = {
    standard: '#0D9488',
    alloy: '#D97706',
    export: '#DC2626',
    foam: '#059669',
    longFiber: '#7C3AED',
    unknown: '#6C757B',
  };

  const searchRules = (query: string) => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const results: { category: string; code: string; meaning: string }[] = [];

    // 搜索产品类别
    Object.entries(CATEGORY_CODES).forEach(([code, meaning]) => {
      if (meaning.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
        results.push({ category: '产品类别', code, meaning });
      }
    });

    // 搜索改性类型
    Object.entries(MODIFIER_CODES).forEach(([code, meaning]) => {
      if (meaning.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
        results.push({ category: '改性类型', code, meaning });
      }
    });

    // 搜索颜色
    Object.entries(COLOR_CODES).forEach(([code, info]) => {
      if (info.cn.includes(q) || info.en.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
        results.push({ category: '颜色代码', code, meaning: `${info.cn} (${info.en})` });
      }
    });

    // 搜索应用特性
    Object.entries(APPLICATION_CODES).forEach(([code, meaning]) => {
      if (meaning.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
        results.push({ category: '应用特性', code, meaning });
      }
    });

    // 搜索阻燃等级
    Object.entries(FLAME_RETARDANT_CODES).forEach(([code, meaning]) => {
      if (meaning.toLowerCase().includes(q) || code.toLowerCase().includes(q)) {
        results.push({ category: '阻燃等级', code, meaning });
      }
    });

    return results;
  };

  const searchResults = searchRules(searchQuery);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#0D9488] to-[#059669] rounded-lg shadow-md">
            <Search size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">牌号解析器</h2>
            <p className="text-xs text-[#6C757B] mt-0.5">输入牌号，自动解析各字段含义</p>
          </div>
        </div>
        <button
          onClick={() => { setBatchMode(!batchMode); setResult(null); setBatchResults([]); }}
          className={`px-4 py-2 text-sm border rounded-lg transition-all duration-200 ${
            batchMode
              ? 'border-[#D97706] text-[#D97706] bg-[#D97706]/5'
              : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#0D9488]/40'
          }`}
        >
          {batchMode ? '单条模式' : '批量模式'}
        </button>
      </div>

      {/* 输入区 */}
      <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0D9488] via-[#D97706] to-transparent" />
        <label className="text-sm text-[#6C757B] mb-2 block font-medium">
          {batchMode ? '输入多个牌号（换行/逗号/分号分隔）' : '输入产品牌号'}
        </label>
        {batchMode ? (
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'BM4G2BK-S01\nPM6GN-S02\nH-BG6-S01[RE3]'}
            className="w-full h-32 bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-3 text-sm font-mono focus:outline-none focus:border-[#0D9488] resize-none rounded-lg"
          />
        ) : (
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleParse()}
            placeholder="例如: BM4G2BK-S01"
            className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-3 text-lg font-mono focus:outline-none focus:border-[#0D9488] rounded-lg"
          />
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleParse}
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
              <span className="text-xs font-medium text-[#92400E] flex items-center gap-1"><Sparkles size={11} /> 从图片/文件识别牌号</span>
              <button onClick={() => { setShowRecognizer(false); setRecognizeStatus('idle'); setRecognizeError(''); }} className="p-0.5 text-[#6C757B] hover:text-[#DC2626] transition-colors"><X size={12} /></button>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.docx,.xlsx" className="hidden" onChange={e => handleRecognizeParserFile(e.target.files)} />
              <button onClick={() => fileInputRef.current?.click()} disabled={recognizeStatus === 'loading'} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#F59E0B] text-white rounded hover:bg-[#D97706] transition-colors disabled:opacity-50"><Upload size={11} /> 上传图片/文件</button>
              <span className="text-[11px] text-[#6C757B]">识别后自动填入输入框</span>
            </div>
            {(recognizeStatus === 'loading' || recognizeStatus === 'recognizing') && (
              <div className="mt-2">
                <div className="flex items-center gap-1.5 text-[10px] text-[#92400E]"><Loader2 size={10} className="animate-spin" /> {recognizeStatus === 'loading' ? '读取中...' : `识别中 ${recognizeProgress}%`}</div>
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
            <button onClick={() => { setHistory([]); localStorage.removeItem('parser_history'); }} className="text-[11px] text-[#DC2626] hover:underline">清空</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setInput(h); setResult(parseCode(h)); }}
                className="px-2 py-1 text-xs font-mono border border-[#E2E8F0] text-[#1A1A2E] hover:border-[#0D9488] hover:text-[#0D9488] rounded-md transition-colors"
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
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0D9488] via-transparent to-transparent" />
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span
                className="px-3 py-1 text-xs font-bold rounded-full"
                style={{ backgroundColor: `${typeColors[result.type]}15`, color: typeColors[result.type] }}
              >
                {typeLabels[result.type]}
              </span>
              <span className="text-[#1A1A2E] font-mono text-lg">{result.fullCode}</span>
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
              className="flex items-center gap-1 text-xs text-[#6C757B] hover:text-[#0D9488] transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-[#0D9488]/30 hover:bg-[#0D9488]/5"
            >
              <Copy size={14} /> 复制表格
            </button>
            <button
              onClick={() => navigate(`/generator?code=${encodeURIComponent(result.fullCode)}`)}
              className="flex items-center gap-1 text-xs text-[#6C757B] hover:text-[#DC2626] transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-[#DC2626]/30 hover:bg-[#DC2626]/5"
            >
              <Sparkles size={14} /> 去生成器编辑
            </button>
          </div>

          {/* 警告 */}
          {result.warnings.length > 0 && (
            <div className="mb-4 space-y-1">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#DC2626] bg-[#DC2626]/5 px-3 py-2 rounded-lg">
                  <AlertTriangle size={12} /> {w}
                </div>
              ))}
            </div>
          )}

          {/* 解析结果 */}
          <div className="space-y-2">
            {result.segments.map((seg, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 border-l-2 bg-gray-50/80 rounded-r-lg transition-all duration-200 hover:bg-gray-50"
                style={{ borderColor: seg.color }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0 rounded-md"
                  style={{ backgroundColor: `${seg.color}15`, color: seg.color }}
                >
                  {seg.position}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6C757B]">{seg.label}</p>
                  <p className="text-sm text-[#1A1A2E] font-bold">{seg.meaning}</p>
                </div>
                <span className="font-mono text-sm" style={{ color: seg.color }}>{seg.value}</span>
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
                <span
                  className="px-2 py-0.5 text-xs font-bold rounded-full"
                  style={{ backgroundColor: `${typeColors[r.type]}15`, color: typeColors[r.type] }}
                >
                  {typeLabels[r.type]}
                </span>
                <span className="text-[#1A1A2E] font-mono">{r.fullCode}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.segments.map((seg, j) => (
                  <span
                    key={j}
                    className="px-2 py-1 text-xs border rounded-md"
                    style={{ borderColor: `${seg.color}40`, color: seg.color, backgroundColor: `${seg.color}08` }}
                  >
                    {seg.label}: {seg.meaning}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 牌号对比 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#0D9488] to-[#D97706] rounded-full" />
          牌号对比
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm">
          <div className="flex gap-2 mb-3">
            <input
              value={compareInput}
              onChange={e => setCompareInput(e.target.value)}
              placeholder="输入两个牌号，用空格或逗号分隔，如: PM4BK PM6BK"
              className="flex-1 bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#0D9488] rounded-lg"
              onKeyDown={e => e.key === 'Enter' && handleCompare()}
            />
            <button onClick={handleCompare} className="px-4 py-2.5 bg-gradient-to-r from-[#0D9488] to-[#059669] text-white font-bold text-sm rounded-lg hover:shadow-lg transition-all">
              对比
            </button>
          </div>
          {compareResult && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left p-2 text-[#6C757B] font-medium">字段</th>
                    <th className="text-left p-2 text-[#0D9488] font-bold font-mono">{compareResult.code1}</th>
                    <th className="text-left p-2 text-[#D97706] font-bold font-mono">{compareResult.code2}</th>
                  </tr>
                </thead>
                <tbody>
                  {compareResult.diffs.map((d, i) => (
                    <tr key={i} className={`border-b border-[#E2E8F0]/40 ${d.same ? 'bg-[#059669]/5' : 'bg-[#DC2626]/5'}`}>
                      <td className="p-2 text-[#6C757B]">{d.label}</td>
                      <td className={`p-2 font-mono ${d.same ? 'text-[#059669]' : 'text-[#DC2626]'}`}>{d.val1}</td>
                      <td className={`p-2 font-mono ${d.same ? 'text-[#059669]' : 'text-[#DC2626]'}`}>{d.val2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 规则搜索 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#D97706] to-[#DC2626] rounded-full" />
          规则搜索
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索规则关键词，如：阻燃、玻纤、黑色、BK..."
            className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm focus:outline-none focus:border-[#D97706] rounded-lg mb-3"
          />
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] shrink-0">{r.category}</span>
                  <span className="font-mono font-bold text-[#D97706] shrink-0">{r.code}</span>
                  <span className="text-sm text-[#1A1A2E]">{r.meaning}</span>
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="text-sm text-[#6C757B] text-center py-3">未找到匹配的规则</p>
          )}
        </div>
      </section>
    </div>
  );
}
