// Adds demo users (one per role, plus one soft-deleted user) and sample tasks.
// Run from the project folder:   node scripts/seed.js
// Safe to run again: it updates the demo users and prints fresh 2FA setup keys.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { authenticator } = require("otplib");
const { createClient } = require("@supabase/supabase-js");

// ---- load .env.local ----
const envFile = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envFile)) {
  console.error("Could not find .env.local in the project folder.");
  process.exit(1);
}
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PEPPER", "ENCRYPTION_KEY"]) {
  if (!process.env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- same algorithms as lib/crypto.js ----
const pepper = (pw) => crypto.createHmac("sha256", process.env.PEPPER).update(pw).digest("base64");
const hashPassword = (pw) => bcrypt.hash(pepper(pw), 12);
function encrypt(data) {
  const key = crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

const PASSWORD = "Demo@12345";
const demoUsers = [
  { username: "manager_ama", email: "ama.manager@example.com", role: "manager" },
  { username: "staff_kofi", email: "kofi.staff@example.com", role: "staff" },
  { username: "viewer_efua", email: "efua.viewer@example.com", role: "viewer" },
  { username: "staff_old", email: "old.staff@example.com", role: "staff", deleted: true },
];

const pad = (n) => String(n).padStart(2, "0");
const ds = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const sampleTasks = (userId) => [
  { title: "Revise database notes", category: "school", priority: "high", remind_time: "09:00", due_date: ds(0) },
  { title: "Submit assignment", category: "school", priority: "high", remind_time: "14:30", due_date: ds(0) },
  { title: "Buy data bundle", category: "personal", priority: "low", remind_time: null, due_date: ds(0), done: true },
  { title: "Call a friend", category: "personal", priority: "medium", remind_time: "18:00", due_date: ds(0) },
  { title: "Prepare presentation slides", category: "school", priority: "medium", remind_time: "10:00", due_date: ds(1) },
  { title: "Group meeting", category: "work", priority: "high", remind_time: "15:00", due_date: ds(1) },
].map((t) => ({ done: false, notes: null, ...t, user_id: userId }));

async function main() {
  const lines = [];
  const passwordHash = await hashPassword(PASSWORD);

  for (const u of demoUsers) {
    const secret = authenticator.generateSecret();
    const row = {
      username: u.username,
      email: u.email,
      role: u.role,
      status: "active",
      password_hash: passwordHash,
      totp_secret_enc: encrypt(Buffer.from(secret, "utf8")).toString("base64"),
      failed_attempts: 0,
      locked_until: null,
      deleted_at: u.deleted ? new Date().toISOString() : null,
    };

    const { data: existing } = await supabase.from("users").select("id").eq("username", u.username).maybeSingle();
    let id;
    if (existing) {
      const { error } = await supabase.from("users").update(row).eq("id", existing.id);
      if (error) throw error;
      id = existing.id;
    } else {
      const { data, error } = await supabase.from("users").insert(row).select("id").single();
      if (error) throw error;
      id = data.id;
    }

    const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", id);
    if (!count) {
      const { error } = await supabase.from("tasks").insert(sampleTasks(id));
      if (error) throw error;
    }

    lines.push(
      `${u.username.padEnd(14)} role: ${u.role.padEnd(8)} ${u.deleted ? "(soft-deleted, cannot log in)" : ""}\n` +
        `   password: ${PASSWORD}\n   2FA setup key: ${secret}\n`
    );
  }

  console.log("\nDemo users are ready.\n");
  console.log(lines.join("\n"));
  console.log("To log in as a demo user, add its setup key to Google Authenticator:");
  console.log("  + > Enter a setup key > any name > paste the key > Time based.\n");
}

main().catch((e) => {
  console.error("Seed failed:", e.message || e);
  process.exit(1);
});
