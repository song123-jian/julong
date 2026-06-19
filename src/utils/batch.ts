// 批次号解析模块
import { BATCH_CODES, BATCH_FORMAT } from './rules';

export interface BatchParseResult {
  type: 'production' | 'test' | 'unknown';
  fullCode: string;
  segments: {
    position: number;
    label: string;
    value: string;
    meaning: string;
  }[];
  warnings: string[];
}

// 解析生产批次号(支持7位/8位/9位等变长格式)
export function parseBatchCode(input: string): BatchParseResult {
  const code = input.trim().toUpperCase();
  const segments: BatchParseResult['segments'] = [];
  const warnings: string[] = [];

  if (!code) {
    return { type: 'unknown', fullCode: code, segments: [], warnings: ['请输入批次号'] };
  }

  // 检测试验品批次号(以TX等开头)
  if (code.startsWith('TX')) {
    return parseTestBatchCode(code);
  }

  // 生产批次号解析（支持变长）
  if (code.length < 5) {
    warnings.push('生产批次号过短，至少5位');
  }

  // 位1: 产品类别代码
  if (code.length >= 1) {
    const ch = code[0];
    const meaning = BATCH_CODES[ch];
    if (meaning) {
      segments.push({ position: 1, label: '产品类别', value: ch, meaning });
    } else {
      segments.push({ position: 1, label: '产品类别', value: ch, meaning: '未知类别' });
      warnings.push(`未知批次产品类别: ${ch}`);
    }
  }

  // 动态定位年号：从第2位开始扫描，找到第一个连续2位数字作为年号
  let yearStart = -1;
  for (let i = 1; i <= code.length - 2; i++) {
    const twoChars = code.substring(i, i + 2);
    if (/^\d{2}$/.test(twoChars)) {
      // 检查是否是合理的年份（00-99）
      const yearNum = parseInt(twoChars);
      if (yearNum >= 0 && yearNum <= 99) {
        yearStart = i;
        break;
      }
    }
  }

  // 如果第2位是字母（如区域码），单独显示
  if (code.length >= 2 && yearStart > 1) {
    const prefix = code.substring(1, yearStart);
    if (/^[A-Z]+$/.test(prefix)) {
      segments.push({
        position: 2,
        label: '区域/工厂码',
        value: prefix,
        meaning: `区域/工厂标识: ${prefix}`,
      });
    }
  }

  // 年号
  if (yearStart >= 0 && yearStart + 2 <= code.length) {
    const year = code.substring(yearStart, yearStart + 2);
    segments.push({
      position: 3,
      label: '年号',
      value: year,
      meaning: `20${year}年`,
    });

    // 顺序号：年号后面的数字部分（4位或5位）
    const seqStart = yearStart + 2;
    const remaining = code.substring(seqStart);
    const seqMatch = remaining.match(/^(\d{4,5})/);
    if (seqMatch) {
      const seq = seqMatch[1];
      segments.push({
        position: 4,
        label: '生产顺序号',
        value: seq,
        meaning: `订单序列编号: ${seq}`,
      });

      // 批次识别码：顺序号后面的剩余部分
      const batchIdStart = seqStart + seq.length;
      if (batchIdStart < code.length) {
        const batchId = code.substring(batchIdStart);
        segments.push({
          position: 5,
          label: '批次识别码',
          value: batchId,
          meaning: `批次号: ${batchId}`,
        });
      }
    } else if (remaining.length > 0) {
      segments.push({
        position: 4,
        label: '附加信息',
        value: remaining,
        meaning: `附加编号: ${remaining}`,
      });
    }
  } else if (code.length >= 3) {
    // 回退：按旧逻辑解析（兼容7位格式）
    const year = code.substring(1, 3);
    segments.push({
      position: 2,
      label: '年号',
      value: year,
      meaning: `20${year}年`,
    });

    if (code.length >= 7) {
      const seq = code.substring(3, Math.min(8, code.length));
      segments.push({
        position: 3,
        label: '生产顺序号',
        value: seq,
        meaning: `订单序列编号: ${seq}`,
      });
    }

    if (code.length > 7) {
      const batchId = code.substring(7);
      segments.push({
        position: 4,
        label: '批次识别码',
        value: batchId,
        meaning: `批次号: ${batchId}`,
      });
    }
  }

  return { type: 'production', fullCode: code, segments, warnings };
}

// 解析试验品批次号
function parseTestBatchCode(code: string): BatchParseResult {
  const segments: BatchParseResult['segments'] = [];
  const warnings: string[] = [];

  // 位1-2: 试验品类型
  const testType = code.substring(0, 2);
  segments.push({
    position: 1,
    label: '试验品类型',
    value: testType,
    meaning: `试验品类别: ${testType}`,
  });

  // 位3-4: 年号
  if (code.length >= 4) {
    const year = code.substring(2, 4);
    segments.push({
      position: 2,
      label: '年号',
      value: year,
      meaning: `20${year}年`,
    });
  }

  // 位5-7: 顺序号
  if (code.length >= 7) {
    const seq = code.substring(4, 7);
    segments.push({
      position: 3,
      label: '试验顺序号',
      value: seq,
      meaning: `试验品顺序号: ${seq}`,
    });
  }

  return { type: 'test', fullCode: code, segments, warnings };
}

// 获取批次号格式说明
export function getBatchFormatInfo() {
  return BATCH_FORMAT;
}
