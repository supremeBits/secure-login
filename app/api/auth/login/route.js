import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { setSession } from "@/lib/session";
import { isLocked, recordFailure } from "@/lib/lockout";

const fail = (message, status = 401) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return fail("Enter your username and password.", 400);

  const { data: user } = await db().from("users").select("*").eq("username", username).maybeSingle();

  if (!user) {
    await hashPassword(password); // keep timing similar so usernames can't be guessed
    return fail("Invalid username or password.");
  }
  if (isLocked(user)) return fail("Account temporarily locked. Try again in 15 minutes.", 423);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await recordFailure(user);
    return fail("Invalid username or password.");
  }

  // Password is correct, but NOT logged in until the 2FA code is verified.
  await setSession({ sub: user.id, stage: "pending" }, 5 * 60);
  return NextResponse.json({ ok: true, next: "2fa" });
}
