"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ActionMenu, Avatar } from "@/components/ui";
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
import "./AppNavContent.css";

export interface AppNavUser {
  name: string;
  email: string;
  avatar: AvatarPreferences;
}

export interface AppNavContentProps {
  isAdmin: boolean;
  user: AppNavUser | null;
  /** Called after a nav link is chosen — lets the mobile drawer close. */
  onNavigate?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Brand, account-level nav links, and the signed-in user block. Rendered
 * inside the desktop sidebar and the mobile navigation drawer, so both
 * always offer the same destinations.
 */
export function AppNavContent({ isAdmin, user, onNavigate }: AppNavContentProps) {
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
    <div className="app-nav">
      <Link href="/" className="app-nav__brand" onClick={onNavigate}>
        <img
          src="/assets/Logos/ExaResume_Full.svg"
          alt="ExaResume"
          className="app-nav__brand-logo"
        />
      </Link>

      <nav className="app-nav__links" aria-label="Account">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={[
                "app-nav__link",
                isActive && "app-nav__link--active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon size={18} className="app-nav__link-icon" />
              {label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="app-nav__user">
          <Avatar name={user.email} size={36} {...user.avatar} />
          <div className="app-nav__user-identity">
            <span className="app-nav__user-name">{user.name}</span>
            <span className="app-nav__user-email">{user.email}</span>
          </div>
          <ActionMenu
            side="top"
            trigger={
              <button
                type="button"
                className="app-nav__user-menu-trigger"
                aria-label="Account menu"
              >
                <MoreVertical size={18} />
              </button>
            }
            items={[
              {
                label: "Log Out",
                icon: LogOut,
                onSelect: () => void handleLogout(),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export default AppNavContent;
