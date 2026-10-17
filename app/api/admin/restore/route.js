import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/permissions";
import { getSettings, saveSettings, validateSettings } from "@/lib/settings";
import { readBackup } from "@/lib/backup";

// Restore the system CONFIGURATION from a restore point or from a backup file.
// This never changes users or tasks - only the settings table.
export async function POST(req) {
  const { user, error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  let config;

  if (body.source === "point") {
    const { data } = await db().from("restore_points").select("config").eq("id", body.id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Restore point not found." }, { status: 404 });
    config = data.config;
  } else if (body.source === "backup") {
    const result = await readBackup(String(body.name || ""));
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    config = Object.fromEntries((result.backup.tables?.settings || []).map((r) => [r.key, r.value]));
  } else {
    return NextResponse.json({ error: "Choose a restore point or a backup." }, { status: 400 });
  }

  const parsed = validateSettings(config);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!Object.keys(parsed.value).length)
    return NextResponse.json({ error: "That source has no settings to restore." }, { status: 400 });

  // Safety net: remember the current configuration first
  await db()
    .from("restore_points")
    .insert({ name: "Auto: before restore", config: await getSettings(), created_by: user.id });

  const { error: dbErr } = await saveSettings(parsed.value);
  if (dbErr) return NextResponse.json({ error: "Could not restore the settings." }, { status: 500 });
  return NextResponse.json({ ok: true, settings: await getSettings() });
}
