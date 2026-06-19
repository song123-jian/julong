import { STANDARD_CODE_STRUCTURE, CATEGORY_CODES, MODIFIER_CODES, COLOR_CODES, APPLICATION_CODES, MELTING_POINTS } from '@/utils/rules';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Code, Palette, Layers } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero区域 */}
      <section className="relative border border-[#E2E8F0] bg-white p-10 scan-effect rounded-xl overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D97706]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0D9488]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#D97706] to-[#EA580C] rounded-lg shadow-md">
              <Zap size={20} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold gradient-text">产品牌号命名规则</h2>
          </div>
          <p className="text-[#6C757B] text-sm max-w-2xl leading-relaxed">
            聚隆科技产品牌号由产品类别、改性类型、含量、颜色、特性、配方号等位段组成，
            每个位段代表特定的产品属性。本系统支持正向生成与反向解析。
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/parser"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white font-bold text-sm rounded-lg hover:shadow-lg hover:shadow-[#D97706]/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              解析牌号 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/generator"
              className="group inline-flex items-center gap-2 px-6 py-3 border border-[#0D9488]/40 text-[#0D9488] font-bold text-sm rounded-lg hover:bg-[#0D9488]/5 hover:border-[#0D9488] transition-all duration-300 hover:-translate-y-0.5"
            >
              生成牌号 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 核心数据卡片 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '产品类别', count: Object.keys(CATEGORY_CODES).length, color: '#D97706', icon: Layers },
          { label: '改性类型', count: Object.keys(MODIFIER_CODES).length, color: '#0D9488', icon: Code },
          { label: '颜色代码', count: Object.keys(COLOR_CODES).length, color: '#EA580C', icon: Palette },
          { label: '应用特性', count: Object.keys(APPLICATION_CODES).length, color: '#059669', icon: Zap },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-hover border border-[#E2E8F0] bg-white p-5 rounded-xl relative overflow-hidden group shadow-sm">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: card.color }} />
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#6C757B] text-xs font-medium">{card.label}</p>
                <Icon size={16} style={{ color: card.color }} className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              </div>
              <p className="text-3xl font-bold font-mono" style={{ color: card.color }}>{card.count}</p>
            </div>
          );
        })}
      </section>

      {/* 命名结构图 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#D97706] to-[#EA580C] rounded-full" />
          标准牌号结构
        </h3>
        <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl shadow-sm">
          {/* 示例牌号 */}
          <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto px-2">
            {'BM4G2BK-S01'.split('').map((ch, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center w-7 h-10 md:w-9 md:h-12 text-base md:text-lg font-bold border-2 rounded-lg transition-transform hover:scale-110 hover:-translate-y-1 shrink-0"
                style={{
                  color: STANDARD_CODE_STRUCTURE[Math.min(i, 8)]?.color || '#6C757B',
                  borderColor: `${STANDARD_CODE_STRUCTURE[Math.min(i, 8)]?.color || '#E2E8F0'}60`,
                  backgroundColor: `${STANDARD_CODE_STRUCTURE[Math.min(i, 8)]?.color || '#6C757B'}10`,
                }}
              >
                {ch}
              </span>
            ))}
          </div>

          {/* 位段说明 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STANDARD_CODE_STRUCTURE.map(seg => (
              <div
                key={seg.position}
                className="card-hover flex items-start gap-3 p-4 border border-[#E2E8F0] bg-gray-50/50 rounded-lg"
              >
                <div
                  className="w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0 rounded-md"
                  style={{ backgroundColor: `${seg.color}15`, color: seg.color }}
                >
                  {seg.position}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: seg.color }}>{seg.label}</p>
                  <p className="text-xs text-[#6C757B] mt-0.5 leading-relaxed">{seg.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 物料熔点速查 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#0D9488] to-[#059669] rounded-full" />
          物料熔点速查
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(MELTING_POINTS).map(([material, temp]) => (
            <div key={material} className="card-hover border border-[#E2E8F0] bg-white p-4 rounded-lg relative overflow-hidden group shadow-sm">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D97706]/30 to-[#0D9488]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[#D97706] font-bold text-sm">{material}</p>
              <p className="text-[#1A1A2E] text-lg font-bold mt-1 font-mono">{temp}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
