// 全局默认值集中管理，避免硬编码散落多处
// 修改后所有引用方会同步更新

export const DEFAULTS = {
  // 报价单默认值
  quotation: {
    sender: '宋建',
    phone: '15589233039',
    footerCompany: '南京聚隆科技股份有限公司',
    greeting: '首先感谢您的信任与配合！ 对于贵司所需的工程塑料材料，我公司当前报价（含税）为：',
    footerContact: '如有疑问，敬请来电垂询。',
    closing: '顺祝\n商祺！',
    moq: 1000,
  },
} as const;

export type QuotationDefaults = typeof DEFAULTS.quotation;
