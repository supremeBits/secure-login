import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import TeamClient from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function Team() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!["admin", "manager"].includes(user.role)) redirect("/dashboard"); // authorization check

  return (
    <AppShell user={user} active="team">
      <TeamClient />
    </AppShell>
  );
}
