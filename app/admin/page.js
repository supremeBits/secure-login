import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/dashboard"); // authorization check

  return (
    <AppShell user={user} active="admin">
      <AdminClient meId={user.id} />
    </AppShell>
  );
}
