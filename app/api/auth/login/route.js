import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { setSession } from "@/lib/session";
import { isLocked, recordFailure } from "@/lib/lockout";
import { getSettings } from "@/lib/settings";

const fail = (message, status = 401) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return fail("Enter your username and password.", 400);

  const settings = await getSettings();
  const { data: user } = await db().from("users").select("*").eq("username", username).maybeSingle();

  if (!user) {
    await hashPassword(password); // keep timing similar so usernames can't be guessed
    return fail("Invalid username or password.");
  }
  if (isLocked(user))
    return fail(`Account temporarily locked. Try again in ${settings.lockout_minutes} minutes.`, 423);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await recordFailure(user, settings);
    return fail("Invalid username or password.");
  }

  // Soft-deleted users stay in the database but can no longer log in
  if (user.deleted_at) return fail("Invalid username or password.");
  if (user.status !== "active") return fail("This account has been disabled. Contact an admin.", 403);

  // Password is correct, but NOT logged in until the 2FA code is verified.
  await setSession({ sub: user.id, stage: "pending" }, 5 * 60);
  return NextResponse.json({ ok: true, next: "2fa" });
}
