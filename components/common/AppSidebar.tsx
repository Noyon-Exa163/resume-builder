"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import "./AppSidebar.css";

export interface AppSidebarProps {
  isAdmin: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Persistent left nav for every authenticated page (dashboard, Account,
 * Manage Users). Page-specific actions (e.g. "New Resume") stay in each
 * page's own header — this only owns account-level navigation.
 */
export function AppSidebar({ isAdmin }: AppSidebarProps) {
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
          { href: "/settings/users", label: "Manage Users", icon: Users },
          { href: "/settings/ai", label: "AI Settings", icon: Sparkles },
        ]
      : []),
  ];

  return (
    <aside className="app-sidebar">
      <Link href="/" className="app-sidebar__brand">
        <img
          src="/assets/Logos/Exabyting-Logomark.svg"
          alt=""
          className="app-sidebar__brand-mark"
        />
        <span className="app-sidebar__brand-name">ExaResume</span>
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

      <button
        type="button"
        className="app-sidebar__logout"
        onClick={() => void handleLogout()}
      >
        <LogOut size={18} className="app-sidebar__nav-icon" />
        Log Out
      </button>
    </aside>
  );
}

export default AppSidebar;
