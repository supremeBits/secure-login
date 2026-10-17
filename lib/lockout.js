import { db } from "@/lib/supabase";

export function isLocked(user) {
  return user.locked_until && new Date(user.locked_until) > new Date();
}

// The limits come from the settings table (admin can change them)
export async function recordFailure(user, settings) {
  const max = settings?.max_login_attempts ?? 5;
  const minutes = settings?.lockout_minutes ?? 15;
  const attempts = user.failed_attempts + 1;
  const update = { failed_attempts: attempts };
  if (attempts >= max) {
    update.failed_attempts = 0;
    update.locked_until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }
  await db().from("users").update(update).eq("id", user.id);
}

export async function clearFailures(userId) {
  await db().from("users").update({ failed_attempts: 0, locked_until: null }).eq("id", userId);
}
