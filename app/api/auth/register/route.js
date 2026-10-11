import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/supabase";
import { hashPassword, encrypt } from "@/lib/crypto";

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
    return fail("Username must be 3-30 letters, numbers or underscores.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email.");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return fail("Password must be 8+ characters with letters and numbers.");

  // Salt + pepper hashing
  const password_hash = await hashPassword(password);

  // 2-step factor: TOTP secret, stored encrypted
  const secret = authenticator.generateSecret();
  const totp_secret_enc = encrypt(Buffer.from(secret, "utf8"), "ENCRYPTION_KEY").toString("base64");

  // Role: the ADMIN_EMAIL account is an admin, everyone else is a normal user
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : "user";

  const { error } = await db()
    .from("users")
    .insert({ username, email, password_hash, totp_secret_enc, role });

  if (error) {
    if (error.code === "23505") return fail("Username or email already taken.", 409);
    console.error(error);
    return fail("Could not create account.", 500);
  }

  const otpauth = authenticator.keyuri(email, "Secure Login", secret);
  const qr = await QRCode.toDataURL(otpauth);
  return NextResponse.json({ ok: true, qr, secret });
}
