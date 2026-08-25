"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { adminNavItems, studentNavItems } from "@/data";
import { cn } from "@/lib/utils";

const DashboardSidebar = () => {
  const pathname = usePathname();
  const user = useAppSelector(useCurrentUser);
  if (!user) return null;

  const items = user.role === "STUDENT" ? studentNavItems : adminNavItems;
  const visibleItems =
    user.role === "STUDENT"
      ? items
      : items.filter((i) => !i.superAdminOnly || user.role === "SUPER_ADMIN");

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
        <GraduationCap className="h-5 w-5 text-primary" />
        <span>Smart MMC</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;