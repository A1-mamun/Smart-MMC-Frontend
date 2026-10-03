import FreeClassLanding from "@/components/modules/freeClass/FreeClassLanding";

/**
 * Single-entry free-classes page. The component decides what to show
 * based on the current auth state:
 *   - Anonymous → tabs to toggle between signup and sign-in forms
 *   - Logged in → chapter-wise video content
 *
 * Sits under (CommonLayout) so the marketing navbar/footer wrap it.
 * Free students do NOT see the dashboard chrome.
 */
const FreeClassesPage = () => <FreeClassLanding />;

export default FreeClassesPage;