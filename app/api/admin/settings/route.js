import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/permissions";
import { getSettings, saveSettings, validateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req) {
  const { error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = validateSettings(body);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { error: dbErr } = await saveSettings(parsed.value);
  if (dbErr) return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  return NextResponse.json({ ok: true, settings: await getSettings() });
}
