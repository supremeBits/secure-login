import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { listBackups } from "@/lib/backup";

export const dynamic = "force-dynamic";

// Current state of the system
export async function GET() {
  const { error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const [{ data: users }, tasksTotal, tasksDone, { data: points }, backups, settings] = await Promise.all([
    db().from("users").select("status, deleted_at"),
    db().from("tasks").select("id", { count: "exact", head: true }),
    db().from("tasks").select("id", { count: "exact", head: true }).eq("done", true),
    db().from("restore_points").select("id, name, created_at").order("created_at", { ascending: false }).limit(20),
    listBackups(),
    getSettings(),
  ]);

  const list = users || [];
  return NextResponse.json({
    state: {
      users_active: list.filter((u) => !u.deleted_at && u.status === "active").length,
      users_disabled: list.filter((u) => !u.deleted_at && u.status === "disabled").length,
      users_deleted: list.filter((u) => u.deleted_at).length,
      tasks_total: tasksTotal.count || 0,
      tasks_done: tasksDone.count || 0,
      last_backup: backups[0]?.name || null,
      server_time: new Date().toISOString(),
    },
    settings,
    backups: backups.slice(0, 14),
    restore_points: points || [],
  });
}
