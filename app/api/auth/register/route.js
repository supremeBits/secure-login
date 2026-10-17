import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { createUserRecord } from "@/lib/users";

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  const settings = await getSettings();
  if (!settings.allow_registration)
    return fail("Registration is closed. Ask an admin to create your account.", 403);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  // The ADMIN_EMAIL account becomes an admin; everyone else starts as staff
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const role = adminEmail && email === adminEmail ? "admin" : "staff";

  const result = await createUserRecord({
    username: body.username,
    email,
    password: body.password,
    role,
  });
  if (result.error) return fail(result.error, result.status);

  return NextResponse.json({ ok: true, qr: result.qr, secret: result.secret });
}
