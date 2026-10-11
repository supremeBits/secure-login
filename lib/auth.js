import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// Returns the fully logged-in user (fresh from the database) or null.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session || session.stage !== "full") return null;
  const { data } = await db()
    .from("users")
    .select("id, username, email, role, created_at")
    .eq("id", session.sub)
    .maybeSingle();
  return data || null;
}
