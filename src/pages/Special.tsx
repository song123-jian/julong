import { useState } from 'react';
import { ALLOY_RULES, SPECIAL_PREFIX, COLOR_MANAGEMENT, PROCESSING_NOTES } from '@/utils/rules';
import { parseCode } from '@/utils/parser';
import { Layers } from 'lucide-react';

export default function Special() {
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<ReturnType<typeof parseCode> | null>(null);

  const handleTest = () => {
    if (testInput.trim()) {
      setTestResult(parseCode(testInput));
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#DC2626] rounded-lg shadow-md">
          <Layers size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">特殊牌号规则</h2>
          <p className="text-xs text-[#6C757B] mt-0.5">合金、特殊前缀、颜色管理等特殊规则</p>
        </div>
      </div>

      {/* 合金产品 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#0D9488] to-[#059669] rounded-full" />
          合金产品系列
        </h3>
        <div className="space-y-3">
          {Object.entries(ALLOY_RULES).map(([code, rule]) => (
            <div key={code} className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[#D97706] font-mono text-lg font-bold bg-[#D97706]/5 px-3 py-1 rounded-md">{code}</span>
                <span className="text-[#6C757B] text-sm">{rule.description}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(rule.breakdown).map(([key, value]) => (
                  <div key={key} className="p-3 bg-gray-50 border border-[#E2E8F0] rounded-lg">
                    <p className="text-[#0D9488] font-mono text-xs font-bold">{key}</p>
                    <p className="text-[#1A1A2E] text-xs mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {rule.example && (
                <p className="text-xs text-[#6C757B] mt-3 border-t border-[#E2E8F0] pt-3">
                  示例: <span className="text-[#D97706] font-mono">{rule.example}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 特殊前缀 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#DC2626] to-[#E11D48] rounded-full" />
          特殊前缀
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(SPECIAL_PREFIX).map(([code, desc]) => (
            <div key={code} className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
              <p className="text-[#DC2626] font-mono text-2xl font-bold">{code}</p>
              <p className="text-[#1A1A2E] text-sm mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 颜色管理规则 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#EA580C] to-[#D97706] rounded-full" />
          颜色管理规则
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm space-y-4">
          <div>
            <p className="text-sm text-[#6C757B]">控制方式</p>
            <p className="text-[#1A1A2E]">{COLOR_MANAGEMENT.controlMethod}</p>
          </div>
          <div>
            <p className="text-sm text-[#6C757B]">本色产品</p>
            <p className="text-[#1A1A2E]">{COLOR_MANAGEMENT.nativeProduct}</p>
          </div>
          <div>
            <p className="text-sm text-[#6C757B]">客户色粉号示例</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_MANAGEMENT.customColorExamples.map(ex => (
                <span key={ex} className="px-2 py-1 text-xs font-mono bg-gray-50 border border-[#E2E8F0] text-[#E11D48] rounded-md">
                  [{ex}]
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 加工注意事项 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#059669] to-[#0D9488] rounded-full" />
          加工注意事项
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm">
          <p className="text-[#1A1A2E]">{PROCESSING_NOTES.alloy}</p>
        </div>
      </section>

      {/* 快速测试 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#6C757B] to-[#1A1A2E] rounded-full" />
          快速测试
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl shadow-sm">
          <div className="flex flex-wrap gap-3">
            <input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTest()}
              placeholder="输入特殊牌号，如 CSAGR-S03[1724]"
              className="flex-1 bg-gray-50 border border-[#E2E8F0] text-[#1A1A2E] p-2.5 text-sm font-mono focus:outline-none focus:border-[#D97706] rounded-lg"
            />
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-[#D97706]/20 transition-all duration-300"
            >
              解析
            </button>
          </div>
          {testResult && (
            <div className="mt-4 space-y-2">
              {testResult.segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 border-l-2 bg-gray-50/80 rounded-r-lg" style={{ borderColor: seg.color }}>
                  <span className="text-xs text-[#6C757B] w-20">{seg.label}</span>
                  <span className="text-sm text-[#1A1A2E]">{seg.meaning}</span>
                  <span className="font-mono text-sm ml-auto" style={{ color: seg.color }}>{seg.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
