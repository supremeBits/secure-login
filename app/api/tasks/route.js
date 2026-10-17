import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { EDITOR_ROLES } from "@/lib/permissions";
import { isDate, parseTask } from "@/lib/tasks";

export const dynamic = "force-dynamic";

// My tasks for one day
export async function GET(req) {
  const { user, error } = await apiAuth();
  if (error) return error;

  const date = new URL(req.url).searchParams.get("date");
  if (!isDate(date)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

  const { data, error: dbErr } = await db()
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("due_date", date)
    .order("done", { ascending: true })
    .order("remind_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (dbErr) return NextResponse.json({ error: "Could not load tasks." }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

// Add a task
export async function POST(req) {
  const { user, error } = await apiAuth(EDITOR_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = parseTask(body);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error: dbErr } = await db()
    .from("tasks")
    .insert({ ...parsed.value, user_id: user.id })
    .select("*")
    .single();
  if (dbErr) return NextResponse.json({ error: "Could not add the task." }, { status: 500 });
  return NextResponse.json({ task: data });
}
