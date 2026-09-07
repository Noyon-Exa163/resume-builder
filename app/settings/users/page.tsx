import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/common/AppShell";
import UsersPageClient from "./UsersPageClient";

/**
 * Server-side admin gate — the API routes already reject non-admins, but
 * without this the page shell would still render for a logged-in
 * non-admin user before their requests failed. Redirect them out entirely.
 */
export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return (
    <AppShell>
      <UsersPageClient />
    </AppShell>
  );
}
