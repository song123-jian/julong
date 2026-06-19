import { useState } from 'react';
import { MELTING_POINTS, PARTICLE_LENGTH, CATEGORY_CODES, MODIFIER_CODES, COLOR_CODES, APPLICATION_CODES, FLAME_RETARDANT_CODES, calcContent } from '@/utils/rules';
import { BookOpen, Search } from 'lucide-react';

export default function Reference() {
  const [search, setSearch] = useState('');

  const filteredMeltingPoints = Object.entries(MELTING_POINTS).filter(
    ([material, temp]) =>
      material.toLowerCase().includes(search.toLowerCase()) ||
      temp.includes(search)
  );
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#EA580C] to-[#D97706] rounded-lg shadow-md">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold gradient-text">参数手册与规则参考</h2>
          <p className="text-xs text-[#6C757B] mt-0.5">完整的牌号规则参考手册</p>
        </div>
      </div>

      {/* 物料熔点 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#0D9488] to-[#059669] rounded-full" />
          物料熔点参考
        </h3>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C757B]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索材料名称或温度..."
            className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:border-[#0D9488] bg-white"
          />
        </div>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">材料</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">熔点范围</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeltingPoints.length > 0 ? (
                filteredMeltingPoints.map(([material, temp], i) => (
                  <tr key={material} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="p-3 text-[#D97706] font-mono font-bold">{material}</td>
                    <td className="p-3 text-[#1A1A2E]">{temp}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-[#6C757B] text-sm">未找到匹配的材料</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 颗粒长度 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#059669] to-[#0D9488] rounded-full" />
          颗粒长度参数
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
            <p className="text-[#6C757B] text-xs">普通产品</p>
            <p className="text-[#1A1A2E] text-lg font-bold mt-1">{PARTICLE_LENGTH.normal}</p>
          </div>
          <div className="border border-[#E2E8F0] bg-white p-5 rounded-xl card-hover shadow-sm">
            <p className="text-[#6C757B] text-xs">长玻纤产品</p>
            <p className="text-[#1A1A2E] text-lg font-bold mt-1">{PARTICLE_LENGTH.longFiber}</p>
          </div>
        </div>
      </section>

      {/* 产品类别代码 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#D97706] to-[#EA580C] rounded-full" />
          产品类别代码(位1)
        </h3>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">代码</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">含义</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORY_CODES).map(([code, name], i) => (
                <tr key={code} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-3 text-[#D97706] font-mono font-bold">{code}</td>
                  <td className="p-3 text-[#1A1A2E]">{name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 改性类型代码 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#0D9488] to-[#059669] rounded-full" />
          改性类型代码(位2)
        </h3>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">代码</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">含义</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(MODIFIER_CODES).map(([code, name], i) => (
                <tr key={code} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-3 text-[#0D9488] font-mono font-bold">{code}</td>
                  <td className="p-3 text-[#1A1A2E]">{name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 含量计算规则 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#DC2626] to-[#E11D48] rounded-full" />
          含量计算规则(位3)
        </h3>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">数字</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">计算公式</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">含量</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => (
                <tr key={i} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-3 text-[#DC2626] font-mono font-bold">{i}</td>
                  <td className="p-3 text-[#6C757B]">{i} × 5% ± 2%</td>
                  <td className="p-3 text-[#1A1A2E]">{calcContent(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 阻燃等级 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#DC2626] to-[#E11D48] rounded-full" />
          阻燃等级(位2为R时)
        </h3>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">代码</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">含义</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(FLAME_RETARDANT_CODES).map(([code, name], i) => (
                <tr key={code} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-3 text-[#DC2626] font-mono font-bold">{code}</td>
                  <td className="p-3 text-[#1A1A2E]">{name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 颜色代码 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#EA580C] to-[#D97706] rounded-full" />
          颜色代码(位6)
        </h3>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">代码</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">中文</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">English</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(COLOR_CODES).map(([code, info], i) => (
                <tr key={code} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-3 text-[#EA580C] font-mono font-bold">{code}</td>
                  <td className="p-3 text-[#1A1A2E]">{info.cn}</td>
                  <td className="p-3 text-[#6C757B]">{info.en}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* 应用特性代码 */}
      <section>
        <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-[#059669] to-[#0D9488] rounded-full" />
          应用特性代码(位7)
        </h3>
        <div className="border border-[#E2E8F0] bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E2E8F0]">
                <th className="text-left p-3 text-[#6C757B] font-medium">代码</th>
                <th className="text-left p-3 text-[#6C757B] font-medium">含义</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(APPLICATION_CODES).map(([code, name], i) => (
                <tr key={code} className={`border-b border-[#E2E8F0]/60 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="p-3 text-[#059669] font-mono font-bold">{code}</td>
                  <td className="p-3 text-[#1A1A2E]">{name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}
