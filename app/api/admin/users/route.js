import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/permissions";
import { createUserRecord } from "@/lib/users";

export const dynamic = "force-dynamic";

// List all users (including soft-deleted ones, marked with deleted_at)
export async function GET() {
  const { error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const { data } = await db()
    .from("users")
    .select("id, username, email, role, status, deleted_at, created_at, failed_attempts, locked_until")
    .order("created_at", { ascending: true });
  return NextResponse.json({ users: data || [] });
}

// Admin adds a user. Returns the 2FA QR so the admin can hand it to the person.
export async function POST(req) {
  const { error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const result = await createUserRecord({
    username: body.username,
    email: body.email,
    password: body.password,
    role: body.role,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, qr: result.qr, secret: result.secret });
}
