import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/permissions";
import { runBackup } from "@/lib/backup";

// "Back up now" button in the admin panel
export async function POST() {
  const { error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const result = await runBackup();
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, file: result.file, counts: result.counts });
}
