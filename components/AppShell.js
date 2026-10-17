import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { getSettings } from "@/lib/settings";

export default async function AppShell({ user, active, children }) {
  const settings = await getSettings();
  const nav = [{ key: "tasks", href: "/dashboard", label: "My tasks" }];
  if (["admin", "manager"].includes(user.role)) nav.push({ key: "team", href: "/team", label: "Team" });
  if (user.role === "admin") nav.push({ key: "admin", href: "/admin", label: "Admin" });

  return (
    <div className="app-wrap">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✅</span> {settings.app_name}
        </div>
        <div className="who">
          <span>{user.username}</span> <span className="badge">{user.role}</span>
        </div>
      </header>
      <nav className="nav">
        {nav.map((n) => (
          <Link key={n.key} href={n.href} className={"navlink" + (active === n.key ? " active" : "")}>
            {n.label}
          </Link>
        ))}
        <LogoutButton />
      </nav>
      {children}
    </div>
  );
}
