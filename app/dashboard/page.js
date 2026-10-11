import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/"); // not logged in (or 2FA not finished)

  return (
    <div className="card">
      <h1>Hey {user.username}! 🎉</h1>
      <p className="sub">You're logged in securely.</p>
      <p>Email: {user.email}</p>
      <p>Your role: <span className="badge">{user.role}</span></p>

      {user.role === "admin" ? (
        <p><Link href="/admin">Open the admin panel</Link></p>
      ) : (
        <p>You have standard access. The admin panel is for admins only.</p>
      )}
      <LogoutButton />
    </div>
  );
}
