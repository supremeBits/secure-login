import { db } from "@/lib/supabase";

export const DEFAULT_SETTINGS = {
  max_login_attempts: 5,
  lockout_minutes: 15,
  session_minutes: 60,
  allow_registration: true,
  reminders_enabled: true,
  app_name: "Secure Tasks",
};

const RULES = {
  max_login_attempts: (v) => Number.isInteger(v) && v >= 3 && v <= 20,
  lockout_minutes: (v) => Number.isInteger(v) && v >= 1 && v <= 1440,
  session_minutes: (v) => Number.isInteger(v) && v >= 5 && v <= 1440,
  allow_registration: (v) => typeof v === "boolean",
  reminders_enabled: (v) => typeof v === "boolean",
  app_name: (v) => typeof v === "string" && v.trim().length >= 1 && v.length <= 40,
};

export async function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  const { data } = await db().from("settings").select("key, value");
  for (const row of data || []) {
    if (row.key in DEFAULT_SETTINGS) out[row.key] = row.value;
  }
  return out;
}

// Keeps only known keys and checks each value. Returns { value } or { error }.
export function validateSettings(input) {
  const value = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (!(key in (input || {}))) continue;
    const v = key === "app_name" ? String(input[key]).trim() : input[key];
    if (!RULES[key](v)) return { error: `Invalid value for ${key}.` };
    value[key] = v;
  }
  return { value };
}

export async function saveSettings(settings) {
  const now = new Date().toISOString();
  const rows = Object.entries(settings).map(([key, value]) => ({ key, value, updated_at: now }));
  if (!rows.length) return { error: null };
  return db().from("settings").upsert(rows);
}
