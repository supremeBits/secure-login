import crypto from "crypto";
import bcrypt from "bcryptjs";

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

// ---------- PASSWORDS: salt + pepper ----------
// PEPPER: secret kept ONLY in the environment (never in the database).
// We mix it in with HMAC-SHA256, then bcrypt adds a unique random SALT per user
// (the salt is stored inside the bcrypt hash string itself).
function applyPepper(password) {
  return crypto.createHmac("sha256", env("PEPPER")).update(password).digest("base64");
}

export async function hashPassword(password) {
  return bcrypt.hash(applyPepper(password), 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(applyPepper(password), hash);
}

// ---------- AES-256-GCM encryption ----------
// Used for the 2FA secrets in the database and for backup files.
// Output layout: [12-byte IV][16-byte auth tag][ciphertext]
function deriveKey(keyEnvName) {
  return crypto.createHash("sha256").update(env(keyEnvName)).digest();
}

export function encrypt(data, keyEnvName) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(keyEnvName), iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decrypt(buf, keyEnvName) {
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(keyEnvName), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
