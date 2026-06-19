import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_KEY_KEY = 'supabase_anon_key';
const SUPABASE_DISABLED_KEY = 'supabase_disabled';

// 优先从环境变量读取（构建时注入），避免密钥明文入仓
// 留空时回退到 localStorage 中的用户配置，再回退到默认值
const ENV_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const ENV_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

// 默认配置仅作为兜底（个人离线/无 env 时使用）
const DEFAULT_SUPABASE_URL = 'https://asoytlhyiujjxmvvkxca.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_lGn2XuKLHSym6huLUpmRtA_wL-HImVs';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (localStorage.getItem(SUPABASE_DISABLED_KEY) === 'true') return null;
  // 优先级：localStorage（用户自定义）> 环境变量 > 默认值
  const url = localStorage.getItem(SUPABASE_URL_KEY) || ENV_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = localStorage.getItem(SUPABASE_KEY_KEY) || ENV_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, anonKey);
  localStorage.removeItem(SUPABASE_DISABLED_KEY);
  // 重新初始化客户端
  supabaseInstance = null;
  getSupabase();
}

export function clearSupabaseConfig() {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_KEY_KEY);
  localStorage.setItem(SUPABASE_DISABLED_KEY, 'true');
  supabaseInstance = null;
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const config = getSupabaseConfig();
  if (!config) return null;
  supabaseInstance = createClient(config.url, config.anonKey);
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

// Supabase 数据库建表 SQL
// 在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：
export const SETUP_SQL = `
-- 报价单表
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 报价记录表
CREATE TABLE IF NOT EXISTS quotation_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 发货记录表
CREATE TABLE IF NOT EXISTS shipping_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 出行记录表
CREATE TABLE IF NOT EXISTS travel_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 物流分工表
CREATE TABLE IF NOT EXISTS logistics_assignments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 物流异常表
CREATE TABLE IF NOT EXISTS logistics_exceptions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 代班历史表
CREATE TABLE IF NOT EXISTS logistics_history (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS（行级安全）
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_history ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许匿名读写（个人使用，简单方案）
-- 策略名称加表名前缀，避免重复执行冲突
DROP POLICY IF EXISTS "Allow all on quotations" ON quotations;
DROP POLICY IF EXISTS "Allow all on quotation_records" ON quotation_records;
DROP POLICY IF EXISTS "Allow all on shipping_records" ON shipping_records;
DROP POLICY IF EXISTS "Allow all on travel_records" ON travel_records;
DROP POLICY IF EXISTS "Allow all on logistics_assignments" ON logistics_assignments;
DROP POLICY IF EXISTS "Allow all on logistics_exceptions" ON logistics_exceptions;
DROP POLICY IF EXISTS "Allow all on logistics_history" ON logistics_history;

CREATE POLICY "Allow all on quotations" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quotation_records" ON quotation_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on shipping_records" ON shipping_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on travel_records" ON travel_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logistics_assignments" ON logistics_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logistics_exceptions" ON logistics_exceptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logistics_history" ON logistics_history FOR ALL USING (true) WITH CHECK (true);
`;
