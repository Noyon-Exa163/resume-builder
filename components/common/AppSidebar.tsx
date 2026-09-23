import { AppNavContent, type AppNavContentProps } from "./AppNavContent";
import "./AppSidebar.css";

export type AppSidebarProps = Omit<AppNavContentProps, "onNavigate">;

/**
 * Persistent left nav for every authenticated page (dashboard, Account,
 * Users) at tablet width and up. Below that, AppTopBar's drawer shows the
 * same AppNavContent. Page-specific actions (e.g. "New Resume") stay in
 * each page's own header — this only owns account-level navigation.
 */
export function AppSidebar({ isAdmin, user }: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <AppNavContent isAdmin={isAdmin} user={user} />
    </aside>
  );
}

export default AppSidebar;
