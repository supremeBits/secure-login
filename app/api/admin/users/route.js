import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { data } = await db()
    .from("users")
    .select("id, username, email, role, created_at")
    .order("created_at", { ascending: false });
  return NextResponse.json({ users: data });
}
