"use client";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardHeader from "@/components/shared/DashboardHeader";
import DashboardSidebar from "@/components/shared/DashboardSidebar";
import ForceChangePasswordModal from "@/components/modules/auth/ForceChangePasswordModal";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Renders the modal on top of the whole dashboard whenever the signed-in
 * user has `mustChangePassword === true`. While that's true the user is
 * also redirected to the dedicated change-password page so they can't
 * poke around the rest of the app in the background. Either way, the
 * modal's overlay + locked dismiss handlers make sure no interactive
 * surface is reachable until the password is updated.
 *
 * We deliberately keep the modal mounted at the layout level (rather
 * than only on the change-password pages) so that an admin or student
 * who deep-links to a dashboard URL while their temp password is still
 * active is gated the same way as someone who arrived via sign-in.
 *
 * Responsive layout:
 *  - < lg (mobile + tablet): no persistent sidebar; the nav lives in a
 *    left-side <Sheet> drawer that the hamburger in the header opens.
 *  - lg+ (medium desktop+): persistent icon-only sidebar that the user
 *    can expand into a full label sidebar via the toggle in the header.
 *    "Medium device" in the spec maps to the lg breakpoint (≥1024px)
 *    where the persistent sidebar first appears; the collapsed default
 *    is what gives the "icon-only" feel on those screens.
 */
const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector(useCurrentUser);
  const mustChange = !!user?.mustChangePassword;

  // Mobile/tablet drawer state.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // lg+ sidebar state: starts collapsed (icon-only) so the dashboard
  // feels roomy on medium desktops without sacrificing the labels on
  // larger screens once the user expands it.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    if (!mustChange || !user) return;
    const target =
      user.role === "STUDENT"
        ? "/dashboard/student/change-password"
        : "/dashboard/change-password";
    if (pathname !== target) {
      router.replace(target);
    }
  }, [mustChange, user, pathname, router]);

  // Close the drawer whenever the route changes so tapping a link
  // doesn't leave the overlay covering the page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-background">
      {/* Persistent (lg+) sidebar — always mounted, but tailwind `hidden`
          keeps it off-screen below lg. The lg+ render path inside the
          component decides between collapsed (icon-only) and expanded. */}
      <DashboardSidebar collapsed={sidebarCollapsed} />

      {/* Mobile/tablet drawer — same nav rendered as Sheet content.
          Sheet handles the overlay + slide animation; we just feed it
          the drawer body via the `variant="drawer"` sidebar prop. */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] p-0 gap-0"
        >
          {/* Visually hidden but accessible to screen readers. */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation for the dashboard.
          </SheetDescription>
          <DashboardSidebar variant="drawer" />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          onMenuClick={() => setDrawerOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        />
        {/*
          When the modal is open we keep the children in the DOM but
          visibly dim them via the Dialog overlay (z-50). aria-inert /
          pointer-events keeps focus trapped inside the dialog.
        */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          aria-hidden={mustChange}
          inert={mustChange}
          style={mustChange ? { pointerEvents: "none", userSelect: "none" } : undefined}
        >
          {children}
        </main>
      </div>
      <ForceChangePasswordModal />
    </div>
  );
};

export default DashboardLayout;
