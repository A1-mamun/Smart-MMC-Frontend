import { ReactNode } from "react";

/**
 * Kiosk layout — passthrough. We use a dedicated route group
 * `(kiosk)` so the kiosk page can opt out of the dashboard
 * chrome (sidebar, top tablist, header) that the
 * `(DashboardLayout)` group provides to the rest of the admin
 * surface. The kiosk view is meant to be opened in a full-screen
 * popup window with no app navigation.
 */
export default function KioskLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}