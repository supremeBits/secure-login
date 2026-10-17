import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // Vercel Cron automatically sends: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runBackup();
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, file: result.file, rows: result.counts.users, counts: result.counts });
}
