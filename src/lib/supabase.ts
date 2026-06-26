import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_KEY_KEY = 'supabase_anon_key';
const SUPABASE_DISABLED_KEY = 'supabase_disabled';

// Prefer env at build time, then fall back to user-provided local config.
const ENV_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const ENV_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

let supabaseInstance: SupabaseClient | null = null;

export function hasEmbeddedSupabaseConfig(): boolean {
  return Boolean(ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY);
}

export function isUsingEmbeddedSupabaseConfig(): boolean {
  if (localStorage.getItem(SUPABASE_DISABLED_KEY) === 'true') return false;

  const localUrl = localStorage.getItem(SUPABASE_URL_KEY);
  const localAnonKey = localStorage.getItem(SUPABASE_KEY_KEY);
  return !localUrl && !localAnonKey && hasEmbeddedSupabaseConfig();
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (localStorage.getItem(SUPABASE_DISABLED_KEY) === 'true') return null;

  const url = localStorage.getItem(SUPABASE_URL_KEY) || ENV_SUPABASE_URL;
  const anonKey = localStorage.getItem(SUPABASE_KEY_KEY) || ENV_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, anonKey);
  localStorage.removeItem(SUPABASE_DISABLED_KEY);
  supabaseInstance = null;
  getSupabase();
}

export function clearSupabaseConfig() {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_KEY_KEY);
  localStorage.setItem(SUPABASE_DISABLED_KEY, 'true');
  supabaseInstance = null;
}

export function restoreEmbeddedSupabaseConfig() {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_KEY_KEY);
  localStorage.removeItem(SUPABASE_DISABLED_KEY);
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

// Run this in the Supabase SQL editor to create the required tables.
// The sample policies below are only suitable for a personal project/database.
// Do not reuse a shared public project for multiple users.
export const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_records (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_assignments (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_exceptions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_history (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_history ENABLE ROW LEVEL SECURITY;

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
