// 聚隆科技产品牌号命名规则数据

// 1. 产品类别代码(位1)
export const CATEGORY_CODES: Record<string, string> = {
  P: '聚丙烯(PP)',
  A: '尼龙66(PA66)',
  B: '尼龙6(PA6)',
  T: 'PBT',
  S: 'ABS',
  C: '聚碳酸酯(PC)',
  E: '聚乙烯或烯烃弹性体',
};

// PET为3字符,单独处理
export const PET_CODE = { PET: 'PET树脂' };

// 2. 主改性材料类型代码(位2)
export const MODIFIER_CODES: Record<string, string> = {
  M: '矿物填充类',
  N: '无填充类',
  G: '玻纤增强类',
  R: '阻燃类',
  F: '防火阻燃类型',
  I: '增韧类',
  H: '高抗冲类',
  O: '聚苯醚合金改性类',
};

// 3. 含量基础数字规则(位3)
// 数字 × 5% ± 2%
export function calcContent(digit: number): string {
  return `${digit * 5}% ± 2%`;
}

// 阻燃等级(位3,当位2为R时)
export const FLAME_RETARDANT_CODES: Record<string, string> = {
  R0: 'V0级阻燃',
  R1: 'V1级阻燃',
  R2: 'V2级阻燃',
};

// 4. 颜色代码(2字符)
export const COLOR_CODES: Record<string, { en: string; cn: string }> = {
  BK: { en: 'Black', cn: '黑色' },
  GN: { en: 'Green', cn: '绿色' },
  YL: { en: 'Yellow', cn: '黄色' },
  OR: { en: 'Orange', cn: '橙色' },
  BL: { en: 'Blue', cn: '蓝色' },
  BR: { en: 'Brown', cn: '棕色' },
  GR: { en: 'Grey', cn: '灰色' },
  RE: { en: 'Red', cn: '红色' },
  YE: { en: 'Beige', cn: '米黄色' },
  WH: { en: 'White', cn: '白色' },
};

// 5. 产品应用特性代码(位7)
export const APPLICATION_CODES: Record<string, string> = {
  T: '耐高温性能',
  W: '耐候要求',
  F: '易脱模加工',
  C: '耐磨',
  G: '高光泽',
};

// 6. 物料熔点
export const MELTING_POINTS: Record<string, string> = {
  PP: '160-170°C',
  ABS: '200-240°C',
  PA66: '255-265°C',
  PA6: '215-220°C',
  PBT: '220-225°C',
  PET: '255-260°C',
  PC: '220-230°C',
  'PC/ABS': '230-260°C',
  'PC/ASA': '240-260°C',
};

// 7. 颗粒长度参数
export const PARTICLE_LENGTH = {
  normal: '3mm ~ 6mm',
  longFiber: '12mm ± 2mm',
};

// 8. 加工温度注意事项
export const PROCESSING_NOTES = {
  alloy: '合金材料加工温度范围相对较窄,过程重点关注挤出温度和抽真空口定期检查,发现异常及时隔离异常物料',
};

// 9. 特殊前缀
export const SPECIAL_PREFIX: Record<string, string> = {
  H: '核销产品(出口)',
  F: '发泡产品',
  L: '长玻纤产品',
};

// 10. 颜色管理特殊规则
export const COLOR_MANAGEMENT = {
  customColorExamples: ['HZD', 'ZCT', 'HZW', 'HBK', 'M10', '1937', '3019'],
  controlMethod: '色板灯箱下比照或色差数据控制',
  nativeProduct: '本色产品无颜色编号,依据质量部标样进行首、末件和过程比照',
};

// 11. 配方识别号规则
export const FORMULA_CODES = {
  common: ['S01', 'S02', 'S24'],
  foamPrefix: 'F',
  longFiberPrefix: 'L',
};

// 12. 生产批次号类别代码
export const BATCH_CODES: Record<string, string> = {
  T: '量产产品',
  B: '半成品',
  C: '定型生产产品',
  S: '超过200KG的试料',
};

// 13. 批次号格式规则
export const BATCH_FORMAT = {
  production: '7位号码 = 公元年号末两位 + 生产顺序号(5位)',
  test: '7位号码 = 试验品类型(2位,如TX) + 试验品顺序号(5位)',
  structure: {
    position1: '生产产品类别代码(T/B/C/S) 或 试验品类型(TX等)',
    position2_3: '公元年号后两位(如2018简写18)',
    position4_8: '订单序列编号/试验品顺序号,5位数字(如00139)',
    position9_10: '批次号识别码(01、02...)',
  },
};

// 14. 试验品类别代码
export const TEST_CODES: Record<string, string> = {
  A: 'PA66',
  B: 'PA6',
  P: 'PP',
  C: 'PC',
  E: 'TPE',
  O: 'PPO',
  F: '发泡材料',
  S: 'ABS',
};

// 15. 合金产品详细规则
export const ALLOY_RULES: Record<string, {
  description: string;
  breakdown: Record<string, string>;
  example?: string;
}> = {
  CSAGR: {
    description: 'PC+ABS合金产品',
    breakdown: {
      C: '聚碳酸酯(PC)',
      S: 'ABS材料',
      A: '合金(Alloy)',
      GR: '型号代码',
    },
    example: 'CSAGR-S03[1724] = PC+ABS合金,S03配方,[1724]客户色粉号',
  },
  CSROP: {
    description: 'PC+ABS合金产品(另一系列)',
    breakdown: {
      C: 'PC',
      S: 'ABS',
      ROP: '型号代码',
    },
  },
  CPETG: {
    description: 'PC+PET合金复合增强玻纤产品',
    breakdown: {
      C: '聚碳酸酯(PC)',
      PET: 'PET材料',
      G: '玻纤增强',
    },
    example: 'CPETG2BK = PC+PET合金,玻纤增强10%±2%,黑色',
  },
};

// 标准牌号结构定义
export interface CodeStructure {
  position: number;
  label: string;
  description: string;
  color: string; // 用于UI高亮显示
}

export const STANDARD_CODE_STRUCTURE: CodeStructure[] = [
  { position: 1, label: '产品类别', description: '1字符,标识基材类型', color: '#F5B700' },
  { position: 2, label: '改性类型', description: '1字符,标识主改性材料', color: '#2EC4B6' },
  { position: 3, label: '含量/阻燃', description: '1字符,数字×5%±2% 或 阻燃等级', color: '#E63946' },
  { position: 4, label: '改性含量', description: '1字符,改性材料含量基础数字', color: '#457B9D' },
  { position: 5, label: '复合改性', description: '1字符,复合改性材料含量', color: '#6A4C93' },
  { position: 6, label: '颜色代码', description: '2字符,颜色英文缩写', color: '#F77F00' },
  { position: 7, label: '应用特性', description: '1字符,产品应用特性代码', color: '#06D6A0' },
  { position: 8, label: '连接符', description: '0/1字符,"-"或"."', color: '#ADB5BD' },
  { position: 9, label: '配方号', description: '1-3字符,配方识别号', color: '#118AB2' },
];
