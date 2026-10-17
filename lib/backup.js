import { db } from "@/lib/supabase";
import { encrypt, decrypt } from "@/lib/crypto";

const KEEP_LAST = 14;
const NAME = /^backup-[A-Za-z0-9_.-]+\.enc$/;

export async function runBackup() {
  const supabase = db();
  const tables = {};
  for (const t of ["users", "tasks", "settings", "restore_points"]) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) return { error: `${t}: ${error.message}` };
    tables[t] = data;
  }

  const snapshot = JSON.stringify({ created_at: new Date().toISOString(), tables });

  // AES-256-GCM encrypt before the file leaves the server
  const encrypted = encrypt(Buffer.from(snapshot, "utf8"), "BACKUP_KEY");

  const file = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.enc`;
  const { error: upErr } = await supabase.storage
    .from("backups")
    .upload(file, encrypted, { contentType: "application/octet-stream" });
  if (upErr) return { error: upErr.message };

  // Keep only the newest backups
  const names = (await listBackups()).map((b) => b.name);
  const old = names.slice(KEEP_LAST);
  if (old.length) await supabase.storage.from("backups").remove(old);

  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  return { file, counts };
}

export async function listBackups() {
  const { data } = await db().storage.from("backups").list("", { limit: 1000 });
  return (data || [])
    .filter((f) => f.name.endsWith(".enc"))
    .map((f) => ({ name: f.name, created_at: f.created_at || null }))
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}

export async function readBackup(name) {
  if (!NAME.test(name)) return { error: "Invalid backup name." };
  const { data, error } = await db().storage.from("backups").download(name);
  if (error || !data) return { error: "Could not download that backup." };
  try {
    const buf = Buffer.from(await data.arrayBuffer());
    return { backup: JSON.parse(decrypt(buf, "BACKUP_KEY").toString("utf8")) };
  } catch {
    return { error: "Could not decrypt that backup (wrong BACKUP_KEY?)." };
  }
}
