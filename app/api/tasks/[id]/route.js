import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { EDITOR_ROLES } from "@/lib/permissions";
import { parseTask } from "@/lib/tasks";

// Edit a task or tick it off. Only the owner can change it.
export async function PATCH(req, { params }) {
  const { user, error } = await apiAuth(EDITOR_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = parseTask(body, { partial: true });
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!Object.keys(parsed.value).length)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error: dbErr } = await db()
    .from("tasks")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (dbErr) return NextResponse.json({ error: "Could not update the task." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task: data });
}

export async function DELETE(_req, { params }) {
  const { user, error } = await apiAuth(EDITOR_ROLES);
  if (error) return error;

  const { error: dbErr } = await db()
    .from("tasks")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (dbErr) return NextResponse.json({ error: "Could not delete the task." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
