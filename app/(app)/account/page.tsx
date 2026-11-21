import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listResumesForUser } from "@/lib/db/resumeQueries";
import AccountPageClient, { type AccountStats } from "./AccountPageClient";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Decorative counts — a DB hiccup shouldn't 500 the settings page, so on
  // failure the stat strip just hides (the client renders nothing for null).
  // "Owned" uses the same definition as the dashboard: access === "owner".
  let stats: AccountStats | null = null;
  try {
    const entries = await listResumesForUser(user);
    const owned = entries.filter((entry) => entry.access === "owner").length;
    stats = { owned, shared: entries.length - owned };
  } catch {
    stats = null;
  }

  return (
    <AccountPageClient
      name={user.name}
      email={user.email}
      role={user.role}
      memberSince={user.createdAt}
      avatar={user.avatar}
      stats={stats}
    />
  );
}
