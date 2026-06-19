// 牌号解析引擎
import {
  CATEGORY_CODES,
  MODIFIER_CODES,
  COLOR_CODES,
  APPLICATION_CODES,
  FLAME_RETARDANT_CODES,
  calcContent,
  ALLOY_RULES,
} from './rules';

export interface ParsedSegment {
  position: number;
  label: string;
  value: string;
  meaning: string;
  color: string;
}

export interface ParseResult {
  type: 'standard' | 'alloy' | 'export' | 'foam' | 'longFiber' | 'unknown';
  segments: ParsedSegment[];
  fullCode: string;
  warnings: string[];
}

// 解析标准牌号
function parseStandardCode(code: string): ParseResult {
  const segments: ParsedSegment[] = [];
  const warnings: string[] = [];

  // 去除方括号中的客户色粉号
  let customColor = '';
  const bracketMatch = code.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    customColor = bracketMatch[1];
    code = code.replace(/\[[^\]]+\]/, '');
  }

  // 分离配方号（支持 - 和 . 作为连接符）
  let formulaPart = '';
  let connector = '';
  const dashIdx = code.indexOf('-');
  const dotIdx = code.indexOf('.');
  let sepIdx = -1;
  if (dashIdx !== -1 && dotIdx !== -1) {
    sepIdx = Math.min(dashIdx, dotIdx);
    connector = code[sepIdx];
  } else if (dashIdx !== -1) {
    sepIdx = dashIdx;
    connector = '-';
  } else if (dotIdx !== -1) {
    sepIdx = dotIdx;
    connector = '.';
  }
  if (sepIdx !== -1) {
    formulaPart = code.substring(sepIdx + 1);
    code = code.substring(0, sepIdx);
  }

  let pos = 0;

  // 位1: 产品类别
  if (pos < code.length) {
    const ch = code[pos];
    const meaning = CATEGORY_CODES[ch];
    if (meaning) {
      segments.push({ position: 1, label: '产品类别', value: ch, meaning, color: '#F5B700' });
    } else {
      segments.push({ position: 1, label: '产品类别', value: ch, meaning: '未知类别', color: '#F5B700' });
      warnings.push(`未知产品类别代码: ${ch}`);
    }
    pos++;
  }

  // 位2: 主改性类型
  if (pos < code.length) {
    const ch = code[pos];
    const meaning = MODIFIER_CODES[ch];
    if (meaning) {
      segments.push({ position: 2, label: '改性类型', value: ch, meaning, color: '#2EC4B6' });
    } else {
      segments.push({ position: 2, label: '改性类型', value: ch, meaning: '未知改性', color: '#2EC4B6' });
      warnings.push(`未知改性类型代码: ${ch}`);
    }
    pos++;
  }

  // 位3: 含量/阻燃等级/特殊编码
  if (pos < code.length) {
    const ch = code[pos];
    if (segments.length >= 2 && segments[1].value === 'R') {
      // 阻燃等级
      const flameKey = `R${ch}`;
      const meaning = FLAME_RETARDANT_CODES[flameKey];
      if (meaning) {
        segments.push({ position: 3, label: '阻燃等级', value: flameKey, meaning, color: '#E63946' });
      } else {
        segments.push({ position: 3, label: '阻燃等级', value: flameKey, meaning: `R${ch}级阻燃`, color: '#E63946' });
      }
    } else if (segments.length >= 2 && ['N', 'I', 'H'].includes(segments[1].value) && ch === '0') {
      // N(无填充)/I(增韧)/H(高抗冲) 后的 0 表示无矿物
      segments.push({ position: 3, label: '编码', value: ch, meaning: '无矿物', color: '#E63946' });
    } else {
      // 含量数字
      const digit = parseInt(ch);
      if (!isNaN(digit)) {
        segments.push({ position: 3, label: '含量基础', value: ch, meaning: calcContent(digit), color: '#E63946' });
      } else {
        segments.push({ position: 3, label: '含量基础', value: ch, meaning: '未知含量', color: '#E63946' });
        warnings.push(`无法解析含量: ${ch}`);
      }
    }
    pos++;
  }

  // 位4: 改性材料含量
  if (pos < code.length) {
    const ch = code[pos];
    const digit = parseInt(ch);
    if (!isNaN(digit)) {
      segments.push({ position: 4, label: '改性含量', value: ch, meaning: calcContent(digit), color: '#457B9D' });
    } else {
      // 可能是颜色代码的开始
      // 回退: 尝试解析为颜色
      const remaining = code.substring(pos);
      const colorResult = tryParseColor(remaining);
      if (colorResult) {
        segments.push(colorResult.segment);
        pos += colorResult.consumed;
      } else {
        segments.push({ position: 4, label: '改性含量', value: ch, meaning: '未知', color: '#457B9D' });
        pos++;
      }
    }
    if (segments.length === 3) pos++; // 只有当位4没有跳到颜色时
  }

  // 位5: 复合改性材料含量(可选)
  if (pos < code.length && segments.length >= 4) {
    const ch = code[pos];
    const digit = parseInt(ch);
    if (!isNaN(digit) && code.length - pos > 2) {
      // 后面还有足够字符,这可能是复合改性含量
      segments.push({ position: 5, label: '复合改性', value: ch, meaning: calcContent(digit), color: '#6A4C93' });
      pos++;
    }
  }

  // 位6: 颜色代码(2字符)
  if (pos < code.length) {
    const remaining = code.substring(pos);
    const colorResult = tryParseColor(remaining);
    if (colorResult) {
      segments.push(colorResult.segment);
      pos += colorResult.consumed;
    } else if (remaining.length >= 2) {
      // 可能是客户色粉号
      segments.push({
        position: 6,
        label: '颜色代码',
        value: remaining.substring(0, 2),
        meaning: '非标准颜色代码',
        color: '#F77F00',
      });
      warnings.push(`非标准颜色代码: ${remaining.substring(0, 2)}`);
      pos += 2;
    }
  }

  // 位7: 应用特性(可选)
  if (pos < code.length) {
    const ch = code[pos];
    const meaning = APPLICATION_CODES[ch];
    if (meaning) {
      segments.push({ position: 7, label: '应用特性', value: ch, meaning, color: '#06D6A0' });
      pos++;
    }
  }

  // 位8: 连接符
  if (formulaPart) {
    segments.push({ position: 8, label: '连接符', value: connector, meaning: '配方分隔符', color: '#ADB5BD' });
    segments.push({ position: 9, label: '配方号', value: formulaPart, meaning: `配方识别号: ${formulaPart}`, color: '#118AB2' });
  }

  // 客户色粉号
  if (customColor) {
    segments.push({
      position: 10,
      label: '客户色粉号',
      value: `[${customColor}]`,
      meaning: `客户编号/色粉号: ${customColor}`,
      color: '#FF6B6B',
    });
  }

  return { type: 'standard', segments, fullCode: code + (formulaPart ? `${connector}${formulaPart}` : '') + (customColor ? `[${customColor}]` : ''), warnings };
}

function tryParseColor(remaining: string): { segment: ParsedSegment; consumed: number } | null {
  if (remaining.length >= 2) {
    const twoChar = remaining.substring(0, 2);
    const colorInfo = COLOR_CODES[twoChar];
    if (colorInfo) {
      return {
        segment: {
          position: 6,
          label: '颜色代码',
          value: twoChar,
          meaning: `${colorInfo.cn} (${colorInfo.en})`,
          color: '#F77F00',
        },
        consumed: 2,
      };
    }
  }
  return null;
}

// 解析合金牌号
function parseAlloyCode(code: string): ParseResult {
  const segments: ParsedSegment[] = [];
  const warnings: string[] = [];

  // 提取方括号内容
  let customColor = '';
  const bracketMatch = code.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    customColor = bracketMatch[1];
    code = code.replace(/\[[^\]]+\]/, '');
  }

  // 分离配方号（支持 - 和 . 作为连接符）
  let formulaPart = '';
  let connector = '';
  const dashIdx = code.indexOf('-');
  const dotIdx = code.indexOf('.');
  let sepIdx = -1;
  if (dashIdx !== -1 && dotIdx !== -1) {
    sepIdx = Math.min(dashIdx, dotIdx);
    connector = code[sepIdx];
  } else if (dashIdx !== -1) {
    sepIdx = dashIdx;
    connector = '-';
  } else if (dotIdx !== -1) {
    sepIdx = dotIdx;
    connector = '.';
  }
  if (sepIdx !== -1) {
    formulaPart = code.substring(sepIdx + 1);
    code = code.substring(0, sepIdx);
  }

  // 匹配合金前缀
  let matchedAlloy: string | null = null;
  for (const prefix of Object.keys(ALLOY_RULES)) {
    if (code.startsWith(prefix)) {
      matchedAlloy = prefix;
      break;
    }
  }

  if (matchedAlloy) {
    const rule = ALLOY_RULES[matchedAlloy];
    segments.push({
      position: 1,
      label: '合金系列',
      value: matchedAlloy,
      meaning: rule.description,
      color: '#F5B700',
    });

    // 解析合金各部分
    const remaining = code.substring(matchedAlloy.length);

    // 逐字符解析剩余部分
    for (const [key] of Object.entries(rule.breakdown)) {
      if (key.length > 1) continue; // 跳过多字符键(已在系列中处理)
    }

    // 解析含量数字
    let pos = 0;
    while (pos < remaining.length) {
      const ch = remaining[pos];
      const digit = parseInt(ch);
      if (!isNaN(digit)) {
        segments.push({
          position: segments.length + 1,
          label: '含量基础',
          value: ch,
          meaning: calcContent(digit),
          color: '#E63946',
        });
      } else {
        // 尝试颜色
        const colorPart = remaining.substring(pos);
        const colorResult = tryParseColor(colorPart);
        if (colorResult) {
          segments.push(colorResult.segment);
          pos += colorResult.consumed;
          continue;
        }
        // 未知字符
        segments.push({
          position: segments.length + 1,
          label: '附加代码',
          value: ch,
          meaning: '需参考合金规则手册',
          color: '#6A4C93',
        });
      }
      pos++;
    }
  }

  if (formulaPart) {
    segments.push({ position: segments.length + 1, label: '连接符', value: connector, meaning: '配方分隔符', color: '#ADB5BD' });
    segments.push({ position: segments.length + 1, label: '配方号', value: formulaPart, meaning: `配方识别号: ${formulaPart}`, color: '#118AB2' });
  }

  if (customColor) {
    segments.push({
      position: segments.length + 1,
      label: '客户色粉号',
      value: `[${customColor}]`,
      meaning: `客户编号/色粉号: ${customColor}`,
      color: '#FF6B6B',
    });
  }

  return { type: 'alloy', segments, fullCode: code + (formulaPart ? `${connector}${formulaPart}` : '') + (customColor ? `[${customColor}]` : ''), warnings };
}

// 解析核销牌号
function parseExportCode(code: string): ParseResult {
  const segments: ParsedSegment[] = [];
  const warnings: string[] = [];

  // H- 前缀
  segments.push({
    position: 1,
    label: '特殊前缀',
    value: 'H',
    meaning: '核销产品(出口)',
    color: '#E63946',
  });

  // 去掉 H- 前缀后解析剩余部分
  const remaining = code.replace(/^H-/, '');
  const innerResult = parseStandardCode(remaining);

  innerResult.segments.forEach((seg, idx) => {
    segments.push({ ...seg, position: idx + 2 });
  });
  warnings.push(...innerResult.warnings);

  return { type: 'export', segments, fullCode: code, warnings };
}

// 解析发泡牌号
function parseFoamCode(code: string): ParseResult {
  const segments: ParsedSegment[] = [];
  const warnings: string[] = [];

  // F+序号
  segments.push({
    position: 1,
    label: '发泡前缀',
    value: 'F',
    meaning: '发泡产品',
    color: '#2EC4B6',
  });

  const numPart = code.substring(1);
  segments.push({
    position: 2,
    label: '序号',
    value: numPart,
    meaning: `发泡产品序号: ${numPart}`,
    color: '#F5B700',
  });

  return { type: 'foam', segments, fullCode: code, warnings };
}

// 解析长玻纤牌号
function parseLongFiberCode(code: string): ParseResult {
  const segments: ParsedSegment[] = [];
  const warnings: string[] = [];

  segments.push({
    position: 1,
    label: '长玻纤前缀',
    value: 'L',
    meaning: '长玻纤产品(颗粒长度12mm±2mm)',
    color: '#6A4C93',
  });

  const numPart = code.substring(1);
  segments.push({
    position: 2,
    label: '序号',
    value: numPart,
    meaning: `长玻纤产品序号: ${numPart}`,
    color: '#F5B700',
  });

  return { type: 'longFiber', segments, fullCode: code, warnings };
}

// 主解析函数
export function parseCode(input: string): ParseResult {
  const code = input.trim().toUpperCase();

  if (!code) {
    return { type: 'unknown', segments: [], fullCode: '', warnings: ['请输入产品牌号'] };
  }

  // 检测核销牌号 H- 前缀
  if (code.startsWith('H-')) {
    return parseExportCode(code);
  }

  // 检测发泡牌号 F+数字
  if (/^F\d+$/.test(code)) {
    return parseFoamCode(code);
  }

  // 检测长玻纤牌号 L+数字
  if (/^L\d+$/.test(code)) {
    return parseLongFiberCode(code);
  }

  // 检测合金牌号
  for (const prefix of Object.keys(ALLOY_RULES)) {
    if (code.startsWith(prefix) || code.replace(/\[[^\]]+\]/, '').startsWith(prefix)) {
      return parseAlloyCode(code);
    }
  }

  // 标准牌号解析
  return parseStandardCode(code);
}

// 批量解析
export function batchParse(input: string): ParseResult[] {
  const lines = input.split(/[\n,;，；]/).map(l => l.trim()).filter(Boolean);
  return lines.map(line => parseCode(line));
}
