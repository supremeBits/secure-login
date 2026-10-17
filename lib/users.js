import { authenticator } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/supabase";
import { hashPassword, encrypt } from "@/lib/crypto";
import { ROLES } from "@/lib/permissions";

// Shared by public registration and the admin "add user" form.
export async function createUserRecord({ username, email, password, role }) {
  username = String(username || "").trim();
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
    return { error: "Username must be 3-30 letters, numbers or underscores.", status: 400 };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { error: "Enter a valid email.", status: 400 };
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return { error: "Password must be 8+ characters with letters and numbers.", status: 400 };
  if (!ROLES.includes(role)) return { error: "Invalid role.", status: 400 };

  // Salt + pepper hashing
  const password_hash = await hashPassword(password);

  // 2-step factor secret, stored encrypted
  const secret = authenticator.generateSecret();
  const totp_secret_enc = encrypt(Buffer.from(secret, "utf8"), "ENCRYPTION_KEY").toString("base64");

  const { error } = await db()
    .from("users")
    .insert({ username, email, password_hash, totp_secret_enc, role });

  if (error) {
    if (error.code === "23505") return { error: "Username or email already taken.", status: 409 };
    console.error(error);
    return { error: "Could not create account.", status: 500 };
  }

  const qr = await QRCode.toDataURL(authenticator.keyuri(email, "Secure Tasks", secret));
  return { qr, secret };
}
