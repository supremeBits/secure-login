import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";
const KEEP_LAST = 14;

export async function GET(req) {
  // Vercel Cron automatically sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = db();
  const { data: users, error } = await supabase.from("users").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const snapshot = JSON.stringify({ created_at: new Date().toISOString(), tables: { users } });

  // AES-256-GCM encrypt the whole backup before it leaves the server
  const encrypted = encrypt(Buffer.from(snapshot, "utf8"), "BACKUP_KEY");

  const name = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.enc`;
  const { error: upErr } = await supabase.storage
    .from("backups")
    .upload(name, encrypted, { contentType: "application/octet-stream" });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Keep only the newest backups
  const { data: files } = await supabase.storage.from("backups").list("", { limit: 1000 });
  const old = (files || []).map((f) => f.name).sort().reverse().slice(KEEP_LAST);
  if (old.length) await supabase.storage.from("backups").remove(old);

  return NextResponse.json({ ok: true, file: name, rows: users.length });
}
