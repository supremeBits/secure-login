import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

// A restore point saves ONLY the configuration (settings). Never users or tasks.
export async function POST(req) {
  const { user, error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 60) || "Restore point";

  const { error: dbErr } = await db()
    .from("restore_points")
    .insert({ name, config: await getSettings(), created_by: user.id });
  if (dbErr) return NextResponse.json({ error: "Could not create the restore point." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
