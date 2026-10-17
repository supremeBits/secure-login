import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { TEAM_ROLES } from "@/lib/permissions";
import { isDate } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { error } = await apiAuth(TEAM_ROLES);
  if (error) return error;

  const date = new URL(req.url).searchParams.get("date");
  if (!isDate(date)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

  const [{ data: users }, { data: tasks }] = await Promise.all([
    db().from("users").select("id, username, role, status, deleted_at").order("username"),
    db().from("tasks").select("*").eq("due_date", date).order("done").order("created_at"),
  ]);

  const byUser = new Map();
  for (const t of tasks || []) {
    if (!byUser.has(t.user_id)) byUser.set(t.user_id, []);
    byUser.get(t.user_id).push(t);
  }

  // Show everyone who is not deleted, plus deleted users who still have tasks that day
  const groups = (users || [])
    .filter((u) => !u.deleted_at || byUser.has(u.id))
    .map((u) => ({ user: u, tasks: byUser.get(u.id) || [] }));

  return NextResponse.json({ groups });
}
