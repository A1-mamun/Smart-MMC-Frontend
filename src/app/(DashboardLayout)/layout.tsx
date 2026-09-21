"use client";
import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardHeader from "@/components/shared/DashboardHeader";
import DashboardSidebar from "@/components/shared/DashboardSidebar";
import ForceChangePasswordModal from "@/components/modules/auth/ForceChangePasswordModal";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";

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
 */
const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector(useCurrentUser);
  const mustChange = !!user?.mustChangePassword;

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

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        {/*
          When the modal is open we keep the children in the DOM but
          visibly dim them via the Dialog overlay (z-50). aria-inert /
          pointer-events keeps focus trapped inside the dialog.
        */}
        <main
          className="flex-1 overflow-y-auto p-6"
          aria-hidden={mustChange}
          // `inert` (the HTML attribute, not `aria-inert`) disables
          // every descendant's pointer events AND removes it from the
          // tab order in one shot. React 19 ships it as a typed boolean
          // prop. The dialog overlay + pointer-events: none below are
          // belt-and-braces for the brief window before the redirect
          // useEffect lands on a safe page.
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