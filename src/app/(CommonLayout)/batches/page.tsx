import AdmissionBatchesPage from "@/components/modules/landing/AdmissionBatchesPage";

/**
 * Public `/batches` route. Lists every course currently in
 * ADMISSION status, grouped by HSC batch, with per-slot
 * seat counts ("Full" / "X of Y seats" / "Open · uncapped")
 * and the running admit count per course.
 *
 * Sits under (CommonLayout) so the marketing navbar/footer
 * wrap it. No auth required — the data is fetched from
 * `GET /course/public/admission` which is intentionally
 * public so anonymous visitors can browse open intakes.
 */
const BatchesPage = () => <AdmissionBatchesPage />;

export default BatchesPage;
