"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import type { AvatarPreferences } from "@/lib/avatar";
import { clearPageDataCache } from "@/lib/utils/pageDataCache";
import { ThemeToggle } from "./ThemeToggle";
import {
  FileText,
  LogOut,
  Sparkles,
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
    // The page cache holds this user's data (users list, settings) — drop it
    // so the next person on this tab never sees it.
    clearPageDataCache();
    router.push("/login");
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Resumes", icon: FileText },
    ...(isAdmin
      ? [
          { href: "/users", label: "Users", icon: Users },
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
              // Prefetch the full route (data included) as soon as the
              // sidebar paints: these are dynamic pages, whose default
              // prefetch stops at the loading boundary — meaning every menu
              // click would wait on a fresh server render. With the full
              // payload cached, switching menus is instant for five minutes.
              prefetch={true}
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

      {/* Theme toggle sits directly above the account menu, at the bottom
          of the sidebar (and the mobile drawer, which shares this content). */}
      <div className="app-nav__theme-row">
        <ThemeToggle />
      </div>

      {user && (
        <div className="app-nav__user">
          <div className="app-nav__user-row">
            <Link
              href="/account"
              className="app-nav__user-link"
              aria-label="Open Account Details"
            >
              <Avatar name={user.email} size={36} {...user.avatar} />
              <div className="app-nav__user-identity">
                <span className="app-nav__user-name">{user.name}</span>
                <span className="app-nav__user-email">{user.email}</span>
              </div>
            </Link>
          </div>
          <button
            type="button"
            className="app-nav__logout"
            onClick={() => void handleLogout()}
          >
            <LogOut size={16} aria-hidden="true" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default AppNavContent;
