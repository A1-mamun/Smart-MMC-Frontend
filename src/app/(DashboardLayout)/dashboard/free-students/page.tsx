import FreeStudentsPage from "@/components/modules/freeStudents/FreeStudentsPage";

/**
 * Dedicated roster for free-class accounts — students who signed up via
 * the public /free-classes landing and never enrolled in a paid course.
 *
 * Sits next to /dashboard/students in the sidebar so the marketing / admin
 * team can drill in from the dashboard's "Free Students" KPI card. Reuses
 * the existing `getAllStudents?isFreeAccount=true` query, so no backend
 * change was needed beyond the dashboard cards.
 */
const Page = () => (
  <main className="space-y-6">
    <FreeStudentsPage />
  </main>
);

export default Page;