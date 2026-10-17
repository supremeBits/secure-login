import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { apiAuth } from "@/lib/auth";
import { ADMIN_ROLES, ROLES } from "@/lib/permissions";

// Modify a user: role, status, un-delete, unlock
export async function PATCH(req, { params }) {
  const { user: me, error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const update = {};

  if ("role" in body) {
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    update.role = body.role;
  }
  if ("status" in body) {
    if (!["active", "disabled"].includes(body.status))
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    update.status = body.status;
  }
  if (body.restore) update.deleted_at = null;
  if (body.unlock) {
    update.failed_attempts = 0;
    update.locked_until = null;
  }

  if (params.id === me.id && ("role" in update || update.status === "disabled"))
    return NextResponse.json({ error: "You can't change your own role or disable yourself." }, { status: 400 });
  if (!Object.keys(update).length)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { data, error: dbErr } = await db()
    .from("users")
    .update(update)
    .eq("id", params.id)
    .select("id")
    .maybeSingle();
  if (dbErr) return NextResponse.json({ error: "Could not update the user." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Soft delete: the row stays in the database, the user just can't log in anymore
export async function DELETE(_req, { params }) {
  const { user: me, error } = await apiAuth(ADMIN_ROLES);
  if (error) return error;
  if (params.id === me.id)
    return NextResponse.json({ error: "You can't delete yourself." }, { status: 400 });

  const { data, error: dbErr } = await db()
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id")
    .maybeSingle();
  if (dbErr) return NextResponse.json({ error: "Could not delete the user." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
