import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/dashboard"); // authorization check

  const { data: users } = await db()
    .from("users")
    .select("id, username, email, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="card">
      <h1>Admin panel 🛠️</h1>
      <p className="sub">Everyone who has signed up so far.</p>
      <table>
        <thead>
          <tr><th>Username</th><th>Email</th><th>Role</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><Link href="/dashboard">Back to dashboard</Link></p>
    </div>
  );
}
