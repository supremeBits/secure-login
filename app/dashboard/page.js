import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import AppShell from "@/components/AppShell";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/"); // not logged in (or 2FA not finished)
  const settings = await getSettings();

  return (
    <AppShell user={user} active="tasks">
      <TasksClient canEdit={user.role !== "viewer"} remindersEnabled={settings.reminders_enabled} />
    </AppShell>
  );
}
