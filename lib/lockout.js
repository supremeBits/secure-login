import { db } from "@/lib/supabase";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export function isLocked(user) {
  return user.locked_until && new Date(user.locked_until) > new Date();
}

export async function recordFailure(user) {
  const attempts = user.failed_attempts + 1;
  const update = { failed_attempts: attempts };
  if (attempts >= MAX_ATTEMPTS) {
    update.failed_attempts = 0;
    update.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
  }
  await db().from("users").update(update).eq("id", user.id);
}

export async function clearFailures(userId) {
  await db().from("users").update({ failed_attempts: 0, locked_until: null }).eq("id", userId);
}
