"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { Avatar } from "@/components/ui";
import type { AvatarPreferences } from "@/lib/avatar";
import {
  FileText,
  LogOut,
  MoreVertical,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import "./AppSidebar.css";

export interface AppSidebarProps {
  isAdmin: boolean;
  user: { name: string; email: string; avatar: AvatarPreferences } | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Persistent left nav for every authenticated page (dashboard, Account,
 * Users). Page-specific actions (e.g. "New Resume") stay in each
 * page's own header — this only owns account-level navigation.
 */
export function AppSidebar({ isAdmin, user }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Resumes", icon: FileText },
    { href: "/settings/account", label: "Account", icon: User },
    ...(isAdmin
      ? [
          { href: "/settings/users", label: "Users", icon: Users },
          { href: "/settings/ai", label: "AI Settings", icon: Sparkles },
        ]
      : []),
  ];

  return (
    <aside className="app-sidebar">
      <Link href="/" className="app-sidebar__brand">
        <img
          src="/assets/Logos/ExaResume_Full.svg"
          alt="ExaResume"
          className="app-sidebar__brand-logo"
        />
      </Link>

      <nav className="app-sidebar__nav" aria-label="Account">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "app-sidebar__nav-link",
                isActive && "app-sidebar__nav-link--active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon size={18} className="app-sidebar__nav-icon" />
              {label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="app-sidebar__user">
          <Avatar name={user.email} size={36} {...user.avatar} />
          <div className="app-sidebar__user-identity">
            <span className="app-sidebar__user-name">{user.name}</span>
            <span className="app-sidebar__user-email">{user.email}</span>
          </div>
          <Menu.Root>
            <Menu.Trigger
              className="app-sidebar__user-menu-trigger"
              aria-label="Account menu"
            >
              <MoreVertical size={18} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="top" align="end" sideOffset={8}>
                <Menu.Popup className="app-sidebar__menu">
                  <Menu.Item
                    className="app-sidebar__menu-item"
                    onClick={() => void handleLogout()}
                  >
                    <LogOut size={16} />
                    Log Out
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      )}
    </aside>
  );
}

export default AppSidebar;
