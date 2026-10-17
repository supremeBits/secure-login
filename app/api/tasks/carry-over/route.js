import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { EDITOR_ROLES } from "@/lib/permissions";
import { isDate } from "@/lib/tasks";

// Move my unfinished tasks from one day to another
export async function POST(req) {
  const { user, error } = await apiAuth(EDITOR_ROLES);
  if (error) return error;

  const { from, to } = await req.json().catch(() => ({}));
  if (!isDate(from) || !isDate(to))
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });

  const { data, error: dbErr } = await db()
    .from("tasks")
    .update({ due_date: to, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("due_date", from)
    .eq("done", false)
    .select("id");
  if (dbErr) return NextResponse.json({ error: "Could not move the tasks." }, { status: 500 });
  return NextResponse.json({ moved: (data || []).length });
}
