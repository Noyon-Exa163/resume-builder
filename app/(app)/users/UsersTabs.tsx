"use client";

import { MailQuestion, Users } from "lucide-react";
import { TabsField } from "@/components/ui";

/**
 * The users-page tabs strip for the route's loading fallback — a client
 * component because the tabs' `icon` props are component references, which
 * cannot cross the server→client props boundary from loading.tsx. Rendered
 * inert (content-less): it only reserves the segmented bar's exact look.
 */
export function UsersTabs() {
  return (
    <TabsField
      className="users-page__tabs"
      value="users"
      tabs={[
        {
          value: "users",
          label: "Users",
          icon: Users,
          content: null,
        },
        {
          value: "invites",
          label: "Email Invites",
          icon: MailQuestion,
          content: null,
        },
      ]}
    />
  );
}

export default UsersTabs;
