import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// Fully logged-in, active, not-deleted user (fresh from the database) or null.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session || session.stage !== "full") return null;
  const { data } = await db()
    .from("users")
    .select("id, username, email, role, status, deleted_at, created_at")
    .eq("id", session.sub)
    .maybeSingle();
  if (!data || data.deleted_at || data.status !== "active") return null;
  return data;
}

// For API routes. allowedRoles is optional, e.g. ["admin"].
export async function apiAuth(allowedRoles) {
  const user = await getCurrentUser();
  if (!user)
    return { error: NextResponse.json({ error: "Not logged in." }, { status: 401 }) };
  if (allowedRoles && !allowedRoles.includes(user.role))
    return { error: NextResponse.json({ error: "You do not have permission to do this." }, { status: 403 }) };
  return { user };
}
