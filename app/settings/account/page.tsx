import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/common/AppShell";
import AccountPageClient from "./AccountPageClient";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <AccountPageClient
        name={user.name}
        email={user.email}
        role={user.role}
        memberSince={user.createdAt}
        avatar={user.avatar}
      />
    </AppShell>
  );
}
