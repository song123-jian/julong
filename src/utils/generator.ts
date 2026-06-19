﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// 牌号生成引擎
import {
  CATEGORY_CODES,
  MODIFIER_CODES,
  COLOR_CODES,
  APPLICATION_CODES,
  FLAME_RETARDANT_CODES,
} from './rules';

export interface GeneratorOptions {
  category: string;       // 产品类别代码
  modifier: string;       // 主改性类型代码
  contentDigit: string;   // 含量基础数字 或 阻燃等级
  modifierDigit: string;  // 改性材料含量数字(可选)
  compositeDigit: string; // 复合改性含量数字(可选)
  color: string;          // 颜色代码
  application: string;    // 应用特性代码(可选)
  formula: string;        // 配方识别号(可选)
  customColor: string;    // 客户色粉号(可选)
  connector: string;      // 连接符('-' 或 '.')
}

export function generateCode(options: GeneratorOptions): string {
  let code = '';

  // 位1: 产品类别
  code += options.category || '';

  // 位2: 主改性类型
  code += options.modifier || '';

  // 位3: 含量/阻燃等级
  if (options.modifier === 'R') {
    code += options.contentDigit; // 阻燃等级数字(0/1/2)
  } else {
    code += options.contentDigit || '';
  }

  // 位4: 改性材料含量
  if (options.modifierDigit) {
    code += options.modifierDigit;
  }

  // 位5: 复合改性含量
  if (options.compositeDigit) {
    code += options.compositeDigit;
  }

  // 位6: 颜色代码
  code += options.color || '';

  // 位7: 应用特性
  if (options.application) {
    code += options.application;
  }

  // 位8-9: 配方号
  if (options.formula) {
    code += `${options.connector || '-'}${options.formula}`;
  }

  // 客户色粉号
  if (options.customColor) {
    code += `[${options.customColor}]`;
  }

  return code;
}

/** 校验生成选项是否合法，返回警告列表 */
export function validateOptions(options: GeneratorOptions): string[] {
  const warnings: string[] = [];

  // 必须选择产品类别
  if (!options.category) {
    warnings.push('请选择产品类别（位1）');
  }

  // 必须选择改性类型
  if (!options.modifier) {
    warnings.push('请选择改性类型（位2）');
  }

  // N/I/H + 0 不应有位4改性含量
  if (['N', 'I', 'H'].includes(options.modifier) && options.contentDigit === '0' && options.modifierDigit) {
    warnings.push('无填充/增韧/高抗冲类无矿物时，不应有改性含量（位4）');
  }

  // R 阻燃类必须选阻燃等级
  if (options.modifier === 'R' && !options.contentDigit) {
    warnings.push('阻燃类必须选择阻燃等级（位3）');
  }

  // 配方号需要连接符
  if (options.formula && !options.connector) {
    warnings.push('有配方号时必须选择连接符');
  }

  // 客户色粉号不应包含方括号
  if (options.customColor && /[[\]]/.test(options.customColor)) {
    warnings.push('客户色粉号无需输入方括号，系统自动添加');
  }

  return warnings;
}

// 获取生成器选项列表
export function getGeneratorOptions() {
  return {
    categories: Object.entries(CATEGORY_CODES).map(([code, name]) => ({
      code,
      name,
    })),
    modifiers: Object.entries(MODIFIER_CODES).map(([code, name]) => ({
      code,
      name,
    })),
    contentDigits: Array.from({ length: 10 }, (_, i) => ({
      code: String(i),
      name: `${i} → ${i * 5}% ± 2%`,
    })),
    flameRetardantLevels: Object.entries(FLAME_RETARDANT_CODES).map(([code, name]) => ({
      code: code.replace('R', ''),
      name,
    })),
    colors: Object.entries(COLOR_CODES).map(([code, info]) => ({
      code,
      name: `${info.cn} (${info.en})`,
    })),
    applications: Object.entries(APPLICATION_CODES).map(([code, name]) => ({
      code,
      name,
    })),
    formulas: ['S01', 'S02', 'S24'].map(f => ({ code: f, name: `配方 ${f}` })),
  };
}
