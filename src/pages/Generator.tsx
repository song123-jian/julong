﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useMemo, useEffect } from 'react';
import { generateCode, getGeneratorOptions, GeneratorOptions, validateOptions } from '@/utils/generator';
import { parseCode } from '@/utils/parser';
import { Copy, RotateCcw, CheckCircle, Sparkles, Search, Layers } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Generator() {
  const options = useMemo(() => getGeneratorOptions(), []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [opts, setOpts] = useState<GeneratorOptions>({
    category: '',
    modifier: '',
    contentDigit: '',
    modifierDigit: '',
    compositeDigit: '',
    color: '',
    application: '',
    formula: '',
    customColor: '',
    connector: '-',
  });

  const [copied, setCopied] = useState(false);
  const [showBatchGen, setShowBatchGen] = useState(false);
  const [batchColors, setBatchColors] = useState<string[]>([]);
  const [batchFormulas, setBatchFormulas] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('generator_history');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const generated = useMemo(() => generateCode(opts), [opts]);

  const update = (key: keyof GeneratorOptions, value: string) => {
    setOpts(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setOpts({
      category: '', modifier: '', contentDigit: '', modifierDigit: '',
      compositeDigit: '', color: '', application: '', formula: '', customColor: '',
      connector: '-',
    });
  };

  const handleCopy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setHistory(prev => {
      const next = [generated, ...prev.filter(h => h !== generated)].slice(0, 20);
      localStorage.setItem('generator_history', JSON.stringify(next));
      return next;
    });
  };

  const handleBatchGenerate = () => {
    const results: string[] = [];
    const colors = batchColors.length > 0 ? batchColors : [opts.color || 'BK'];
    const formulas = batchFormulas.length > 0 ? batchFormulas : [opts.formula || ''];
    for (const color of colors) {
      for (const formula of formulas) {
        const code = generateCode({ ...opts, color, formula });
        if (code) results.push(code);
      }
    }
    setBatchResults([...new Set(results)]);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(batchResults.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contentOptions = opts.modifier === 'R'
    ? options.flameRetardantLevels
    : opts.modifier === 'N' || opts.modifier === 'I' || opts.modifier === 'H'
      ? [
          { code: '0', name: '0 → 无矿物' },
          ...options.contentDigits.filter(d => d.code !== '0'),
        ]
      : options.contentDigits;

  // P0-C: 从URL参数回填
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const result = parseCode(code);
      const newOpts: GeneratorOptions = {
        category: '',
        modifier: '',
        contentDigit: '',
        modifierDigit: '',
        compositeDigit: '',
        color: '',
        application: '',
        formula: '',
        customColor: '',
        connector: '-',
      };
      for (const seg of result.segments) {
        switch (seg.label) {
          case '产品类别': newOpts.category = seg.value; break;
          case '改性类型': newOpts.modifier = seg.value; break;
          case '阻燃等级': newOpts.contentDigit = seg.value.replace('R', ''); break;
          case '含量基础': case '编码': newOpts.contentDigit = seg.value; break;
          case '改性含量': newOpts.modifierDigit = seg.value; break;
          case '复合改性': newOpts.compositeDigit = seg.value; break;
          case '颜色代码': newOpts.color = seg.value; break;
          case '应用特性': newOpts.application = seg.value; break;
          case '连接符': newOpts.connector = seg.value; break;
          case '配方号': newOpts.formula = seg.value; break;
          case '客户色粉号': newOpts.customColor = seg.value.replace(/[[\]]/g, ''); break;
        }
      }
      setOpts(newOpts);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#DC2626] to-[#E11D48] rounded-lg shadow-md">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">牌号生成器</h2>
          <p className="text-xs text-[#6C757B] mt-0.5">选择各字段，自动生成产品牌号</p>
        </div>
      </div>

      {/* 实时预览 */}
      <div className="border border-[#E2E8F0] bg-white p-8 text-center rounded-xl relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#DC2626] via-[#D97706] to-[#0D9488]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#D97706]/3 to-transparent" />
        <p className="text-xs text-[#6C757B] mb-3 relative z-10">生成结果</p>
        <p className="text-4xl font-bold font-mono tracking-wider text-[#D97706] min-h-[48px] relative z-10">
          {generated || '---'}
        </p>
        <div className="flex justify-center gap-3 mt-6 relative z-10 flex-wrap">
          <button
            onClick={handleCopy}
            disabled={!generated}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-[#D97706]/20 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0"
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={() => navigate(`/parser?q=${encodeURIComponent(generated)}`)}
            disabled={!generated}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#0D9488] text-[#0D9488] font-bold text-sm rounded-lg hover:bg-[#0D9488]/5 transition-all duration-200 disabled:opacity-30"
          >
            <Search size={14} /> 去解析验证
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#E2E8F0] text-[#6C757B] text-sm hover:text-[#1A1A2E] hover:border-[#6C757B] transition-all duration-200 rounded-lg"
          >
            <RotateCcw size={14} /> 重置
          </button>
        </div>
        {/* 实时解析预览 */}
        {generated && (() => {
          const preview = parseCode(generated);
          if (preview.type === 'unknown' || preview.segments.length === 0) return null;
          return (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]/60">
              <p className="text-xs text-[#6C757B] mb-2">解析含义预览</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {preview.segments.map((seg, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-md border"
                    style={{
                      borderColor: `${seg.color}40`,
                      color: seg.color,
                      backgroundColor: `${seg.color}08`,
                    }}
                  >
                    {seg.label}: {seg.meaning}
                  </span>
                ))}
              </div>
              {/* 校验警告 */}
              {(() => {
                const validationWarnings = validateOptions(opts);
                return validationWarnings.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {validationWarnings.map((w, i) => (
                      <span key={i} className="text-[10px] text-[#D97706]">⚠ {w}</span>
                    ))}
                  </div>
                ) : null;
              })()}
              {preview.warnings.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {preview.warnings.map((w, i) => (
                    <span key={i} className="text-[10px] text-[#DC2626]">⚠ {w}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 选择器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 产品类别 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#D97706] font-bold mb-3 block">位1 · 产品类别</label>
          <div className="flex flex-wrap gap-2">
            {options.categories.map(c => (
              <button
                key={c.code}
                onClick={() => update('category', opts.category === c.code ? '' : c.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.category === c.code
                    ? 'border-[#D97706] text-[#D97706] bg-[#D97706]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#D97706]/40'
                }`}
              >
                <span className="font-bold">{c.code}</span> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 改性类型 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#0D9488] font-bold mb-3 block">位2 · 改性类型</label>
          <div className="flex flex-wrap gap-2">
            {options.modifiers.map(m => (
              <button
                key={m.code}
                onClick={() => update('modifier', opts.modifier === m.code ? '' : m.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.modifier === m.code
                    ? 'border-[#0D9488] text-[#0D9488] bg-[#0D9488]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#0D9488]/40'
                }`}
              >
                <span className="font-bold">{m.code}</span> {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* 含量/阻燃等级 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#DC2626] font-bold mb-3 block">
            位3 · {opts.modifier === 'R' ? '阻燃等级' : '含量基础'}
          </label>
          <div className="flex flex-wrap gap-2">
            {contentOptions.map(c => (
              <button
                key={c.code}
                onClick={() => update('contentDigit', opts.contentDigit === c.code ? '' : c.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.contentDigit === c.code
                    ? 'border-[#DC2626] text-[#DC2626] bg-[#DC2626]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#DC2626]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 改性含量 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#0284C7] font-bold mb-3 block">位4 · 改性含量(可选)</label>
          <div className="flex flex-wrap gap-2">
            {options.contentDigits.map(c => (
              <button
                key={c.code}
                onClick={() => update('modifierDigit', opts.modifierDigit === c.code ? '' : c.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.modifierDigit === c.code
                    ? 'border-[#0284C7] text-[#0284C7] bg-[#0284C7]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#0284C7]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 复合改性含量 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#6A4C93] font-bold mb-3 block">位5 · 复合改性含量(可选)</label>
          <div className="flex flex-wrap gap-2">
            {options.contentDigits.map(c => (
              <button
                key={c.code}
                onClick={() => update('compositeDigit', opts.compositeDigit === c.code ? '' : c.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.compositeDigit === c.code
                    ? 'border-[#6A4C93] text-[#6A4C93] bg-[#6A4C93]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#6A4C93]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 颜色 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#EA580C] font-bold mb-3 block">位6 · 颜色代码</label>
          <div className="flex flex-wrap gap-2">
            {options.colors.map(c => (
              <button
                key={c.code}
                onClick={() => update('color', opts.color === c.code ? '' : c.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.color === c.code
                    ? 'border-[#EA580C] text-[#EA580C] bg-[#EA580C]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#EA580C]/40'
                }`}
              >
                <span className="font-bold">{c.code}</span> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 应用特性 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#059669] font-bold mb-3 block">位7 · 应用特性(可选)</label>
          <div className="flex flex-wrap gap-2">
            {options.applications.map(a => (
              <button
                key={a.code}
                onClick={() => update('application', opts.application === a.code ? '' : a.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.application === a.code
                    ? 'border-[#059669] text-[#059669] bg-[#059669]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#059669]/40'
                }`}
              >
                <span className="font-bold">{a.code}</span> {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* 连接符 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#6C757B] font-bold mb-3 block">位8 · 连接符</label>
          <div className="flex gap-2">
            {[
              { code: '-', name: '横杠 (-)' },
              { code: '.', name: '点号 (.)' },
            ].map(c => (
              <button
                key={c.code}
                onClick={() => update('connector', opts.connector === c.code ? '' : c.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.connector === c.code
                    ? 'border-[#6C757B] text-[#1A1A2E] bg-gray-100 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#6C757B]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 配方号 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#7C3AED] font-bold mb-3 block">位9 · 配方识别号(可选)</label>
          <div className="flex flex-wrap gap-2">
            {options.formulas.map(f => (
              <button
                key={f.code}
                onClick={() => update('formula', opts.formula === f.code ? '' : f.code)}
                className={`px-3 py-1.5 text-xs border rounded-md transition-all duration-200 ${
                  opts.formula === f.code
                    ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5 shadow-sm'
                    : 'border-[#E2E8F0] text-[#6C757B] hover:text-[#1A1A2E] hover:border-[#7C3AED]/40'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
          <input
            value={opts.formula && !options.formulas.some(f => f.code === opts.formula) ? opts.formula : ''}
            onChange={e => update('formula', e.target.value)}
            placeholder="自定义配方号"
            className="mt-3 w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#7C3AED] rounded-lg"
          />
        </div>

        {/* 客户色粉号 */}
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
          <label className="text-sm text-[#E11D48] font-bold mb-3 block">客户色粉号(可选)</label>
          <input
            value={opts.customColor}
            onChange={e => update('customColor', e.target.value)}
            placeholder="例如: HZD、1937"
            className="w-full bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#E11D48] rounded-lg"
          />
          <p className="text-xs text-[#6C757B] mt-2">将自动添加方括号: [HZD]</p>
        </div>
      </div>

      {/* 生成历史 */}
      {history.length > 0 && (
        <div className="border border-[#E2E8F0] bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6C757B]">最近生成</span>
            <button onClick={() => { setHistory([]); localStorage.removeItem('generator_history'); }} className="text-[11px] text-[#DC2626] hover:underline">清空</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => navigate(`/parser?q=${encodeURIComponent(h)}`)}
                className="px-2 py-1 text-xs font-mono border border-[#E2E8F0] text-[#1A1A2E] hover:border-[#DC2626] hover:text-[#DC2626] rounded-md transition-colors"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 批量生成 */}
      <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowBatchGen(!showBatchGen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors"
        >
          <span className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2"><Layers size={16} className="text-[#DC2626]" /> 批量生成（多颜色/配方组合）</span>
          <span className="text-xs text-[#6C757B]">{showBatchGen ? '收起' : '展开'}</span>
        </button>
        {showBatchGen && (
          <div className="p-4 pt-0 space-y-3 border-t border-[#E2E8F0]/60">
            <div>
              <label className="text-xs text-[#6C757B] mb-1.5 block">选择多个颜色（点击切换）</label>
              <div className="flex flex-wrap gap-1.5">
                {options.colors.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setBatchColors(prev => prev.includes(c.code) ? prev.filter(x => x !== c.code) : [...prev, c.code])}
                    className={`px-2 py-1 text-xs border rounded-md transition-all ${batchColors.includes(c.code) ? 'border-[#EA580C] text-[#EA580C] bg-[#EA580C]/5' : 'border-[#E2E8F0] text-[#6C757B]'}`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6C757B] mb-1.5 block">选择多个配方号（点击切换）</label>
              <div className="flex flex-wrap gap-1.5">
                {options.formulas.map(f => (
                  <button
                    key={f.code}
                    onClick={() => setBatchFormulas(prev => prev.includes(f.code) ? prev.filter(x => x !== f.code) : [...prev, f.code])}
                    className={`px-2 py-1 text-xs border rounded-md transition-all ${batchFormulas.includes(f.code) ? 'border-[#7C3AED] text-[#7C3AED] bg-[#7C3AED]/5' : 'border-[#E2E8F0] text-[#6C757B]'}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleBatchGenerate} className="px-4 py-2 bg-gradient-to-r from-[#DC2626] to-[#E11D48] text-white font-bold text-sm rounded-lg hover:shadow-lg transition-all">
              批量生成
            </button>
            {batchResults.length > 0 && (
              <div className="border border-[#E2E8F0] bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#6C757B]">生成结果（{batchResults.length}个）</span>
                  <button onClick={handleCopyAll} className="flex items-center gap-1 text-xs text-[#D97706] hover:underline"><Copy size={10} /> 复制全部</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {batchResults.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs font-mono bg-white border border-[#E2E8F0] rounded">{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
