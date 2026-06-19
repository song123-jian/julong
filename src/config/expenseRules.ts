/**
 * 费用标准常量 - 出行方式与费用标准共用
 */

// 一线城市及省会城市列表
export const TIER1_CITIES = [
  '北京', '上海', '广州', '深圳',
  '南京', '杭州', '武汉', '成都', '重庆', '西安', '长沙', '郑州', '济南', '合肥', '福州', '昆明', '南昌', '贵阳', '太原', '石家庄', '沈阳', '长春', '哈尔滨', '兰州', '海口', '南宁', '呼和浩特', '乌鲁木齐', '银川', '西宁', '拉萨', '天津',
];

/** 判断城市是否为一线城市/省会 */
export const isTier1City = (city: string) => TIER1_CITIES.some(c => city.includes(c));

// 住宿标准
export const HOTEL_TIER1_MAX = 260; // 一线城市封顶
export const HOTEL_NORMAL_MAX = 220; // 一般城市封顶

/** 获取住宿封顶金额 */
export const getHotelMax = (city: string) => isTier1City(city) ? HOTEL_TIER1_MAX : HOTEL_NORMAL_MAX;

// 打车标准
export const TAXI_MAX = 50; // 打车封顶

// 交通报销标准
export const TRANSPORT_TIER1_MAX = 50; // 一线城市交通报销封顶
export const TRANSPORT_NORMAL_MAX = 40; // 一般地区交通报销封顶

// 出差补贴标准
export const ALLOWANCE_NANJING = 60; // 南京省内
export const ALLOWANCE_OTHER = 80; // 其他地区

// 开车油费标准
export const DRIVE_FUEL_RATE = 0.8; // 元/km（参考标准）

/** 获取交通报销封顶金额 */
export const getTransportMax = (city: string) => isTier1City(city) ? TRANSPORT_TIER1_MAX : TRANSPORT_NORMAL_MAX;

/** 检查费用是否超标 */
export interface OverspendResult {
  isOver: boolean;
  standard: number;
  actual: number;
  overAmount: number;
}

export const checkOverspend = (type: 'hotel' | 'taxi' | 'transport', amount: number, city?: string): OverspendResult => {
  let standard: number;
  switch (type) {
    case 'hotel':
      standard = city ? getHotelMax(city) : HOTEL_NORMAL_MAX;
      break;
    case 'taxi':
      standard = TAXI_MAX;
      break;
    case 'transport':
      standard = city ? getTransportMax(city) : TRANSPORT_NORMAL_MAX;
      break;
  }
  const overAmount = Math.max(0, amount - standard);
  return {
    isOver: amount > standard,
    standard,
    actual: amount,
    overAmount,
  };
};

/** 计算开车油费参考 */
export const calcDriveFuelCost = (km: number) => Math.round(km * DRIVE_FUEL_RATE * 100) / 100;
