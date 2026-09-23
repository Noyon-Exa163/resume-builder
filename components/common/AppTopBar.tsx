"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Avatar, Button, Drawer } from "@/components/ui";
import { AppNavContent, type AppNavContentProps } from "./AppNavContent";
import "./AppTopBar.css";

export type AppTopBarProps = Omit<AppNavContentProps, "onNavigate">;

/**
 * Compact header that replaces the sidebar on phones and small tablets.
 * The menu button opens the same nav content in a slide-in drawer; each
 * link closes the drawer as it navigates.
 */
export function AppTopBar({ isAdmin, user }: AppTopBarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <header className="app-topbar">
      <Button
        type="button"
        variant="tertiary"
        size="m"
        iconOnly
        aria-label="Open Navigation"
        aria-expanded={isDrawerOpen}
        onClick={() => setIsDrawerOpen(true)}
      >
        <Menu size={20} />
      </Button>
      <Link href="/" className="app-topbar__brand">
        <img
          src="/assets/Logos/ExaResume_Full.svg"
          alt="ExaResume"
          className="app-topbar__brand-logo"
        />
      </Link>
      {user && (
        <Link
          href="/settings/account"
          className="app-topbar__account"
          aria-label="Account"
        >
          <Avatar name={user.email} size={32} {...user.avatar} />
        </Link>
      )}

      <Drawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title="Navigation"
      >
        <AppNavContent
          isAdmin={isAdmin}
          user={user}
          onNavigate={() => setIsDrawerOpen(false)}
        />
      </Drawer>
    </header>
  );
}

export default AppTopBar;
