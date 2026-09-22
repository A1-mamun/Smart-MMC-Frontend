"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { adminNavItems, studentNavItems } from "@/data";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
};

type Props = {
  /**
   * Render variant for the sidebar:
   *  - "persistent"  → always visible (lg+). Renders icon-only when
   *                    `collapsed === true`, full label + icon otherwise.
   *  - "drawer"      → renders as the *contents* of a `<Sheet>` drawer
   *                    (no outer wrapper, no close handler). The host
   *                    <Sheet> handles the slide-in/out + overlay.
   * Used internally and from DashboardLayout / DashboardHeader.
   */
  variant?: "persistent" | "drawer";
  collapsed?: boolean;
};

/**
 * Shared nav body. `variant="drawer"` skips the outer wrapper so it can
 * be dropped directly into a <SheetContent>; `variant="persistent"` uses
 * the proper aside element + width variants.
 */
const NavBody = ({
  items,
  variant,
  collapsed,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  variant: "persistent" | "drawer";
  collapsed?: boolean;
  pathname: string;
  onNavigate?: () => void;
}) => {
  const isMatch = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const activeHref = items
    .filter((i) => isMatch(i.href))
    .reduce<
      string | null
    >((acc, i) => (acc === null || i.href.length > acc.length ? i.href : acc), null);

  if (variant === "drawer") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span>MEHEDI MATH</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <nav className="flex-1 space-y-1 p-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
              collapsed ? "justify-center" : "gap-3",
              active
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon
              className={cn("shrink-0", collapsed ? "h-6 w-6" : "h-5 w-5")}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
};

const DashboardSidebar = ({
  variant = "persistent",
  collapsed = false,
}: Props) => {
  const pathname = usePathname();
  const user = useAppSelector(useCurrentUser);
  if (!user) return null;

  const items = user.role === "STUDENT" ? studentNavItems : adminNavItems;
  const visibleItems =
    user.role === "STUDENT"
      ? items
      : items.filter((i) => !i.superAdminOnly || user.role === "SUPER_ADMIN");

  if (variant === "drawer") {
    return (
      <NavBody items={visibleItems} variant="drawer" pathname={pathname} />
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:border-r lg:bg-card transition-[width] duration-200",
        collapsed ? "lg:w-12" : "lg:w-52",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b font-semibold",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <GraduationCap
          className={cn(
            "text-primary shrink-0",
            collapsed ? "h-7 w-7" : "h-5 w-5",
          )}
        />
        {!collapsed && <span>MEHEDI MATH</span>}
      </div>
      <NavBody
        items={visibleItems}
        variant="persistent"
        collapsed={collapsed}
        pathname={pathname}
      />
    </aside>
  );
};

export default DashboardSidebar;
