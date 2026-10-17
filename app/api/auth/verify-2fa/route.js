import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { db } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { getSession, setSession } from "@/lib/session";
import { isLocked, recordFailure, clearFailures } from "@/lib/lockout";
import { getSettings } from "@/lib/settings";

authenticator.options = { window: 1 }; // allow 1 step of clock drift

const fail = (message, status = 401) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  const session = await getSession();
  if (!session || session.stage !== "pending")
    return fail("Please log in with your password first.");

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.", 400);

  const settings = await getSettings();
  const { data: user } = await db().from("users").select("*").eq("id", session.sub).maybeSingle();
  if (!user || user.deleted_at) return fail("Account not found.");
  if (user.status !== "active") return fail("This account has been disabled. Contact an admin.", 403);
  if (isLocked(user))
    return fail(`Account temporarily locked. Try again in ${settings.lockout_minutes} minutes.`, 423);

  const secret = decrypt(Buffer.from(user.totp_secret_enc, "base64"), "ENCRYPTION_KEY").toString("utf8");

  if (!authenticator.check(code, secret)) {
    await recordFailure(user, settings);
    return fail("Wrong code.");
  }

  await clearFailures(user.id);
  await setSession({ sub: user.id, stage: "full" }, settings.session_minutes * 60);
  return NextResponse.json({ ok: true });
}
