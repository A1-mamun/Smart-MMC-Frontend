import AutomaticAttendancePage from "@/components/modules/attendance/AutomaticAttendancePage";

/**
 * Kiosk route — opens in a new full-screen browser window
 * (no sidebar, no top tablist) so the operator can hand a
 * barcode scanner to students one after another. Lives in a
 * separate route group `(kiosk)` so the dashboard layout
 * (sidebar + header) is NOT applied — `app/(kiosk)/layout.tsx`
 * is a passthrough.
 */
const Page = () => <AutomaticAttendancePage />;
export default Page;