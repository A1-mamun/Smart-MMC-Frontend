"use client";
import { useRouter } from "next/navigation";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logOut, useCurrentUser } from "@/redux/features/auth/authSlice";
import { logoutUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type Props = {
  /**
   * Mobile/tablet (<lg): open/close the sidebar drawer.
   * lg+: ignored — use `sidebarCollapsed` for the icon-only toggle instead.
   */
  onMenuClick?: () => void;
  /**
   * lg+: toggles between icon-only (collapsed) and full-width persistent sidebar.
   * Hidden on smaller breakpoints.
   */
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

const DashboardHeader = ({
  onMenuClick,
  sidebarCollapsed,
  onToggleSidebar,
}: Props) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(useCurrentUser);

  const handleLogout = async () => {
    dispatch(logOut());
    await logoutUser();
    toast.success("Logged out successfully");
    router.push("/signin");
  };

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile + tablet: hamburger that opens the drawer sidebar. */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* lg+: toggle between icon-only (collapsed) and full sidebar.
            Keeps the layout stable by always rendering the same width. */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>

        <h1 className="text-lg font-semibold truncate">
          {user?.role === "STUDENT" ? "Student Portal" : "Admin Panel"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {initials(user.name)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
