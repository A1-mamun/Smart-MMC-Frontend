/**
 * Two related feature configs that live in the generic `Setting` table
 * on the backend (`absent_warning_sms` and `exam_absence_sms` keys).
 * Mirrors `settings.validation.ts` on the backend.
 */

/**
 * Absent-warning is no longer user-configurable (per the latest spec:
 * always-on, today only, father-only, hardcoded message). The Settings
 * row is kept on the backend for backward compat with already-deployed
 * clients — its shape is the empty object below. We still type it
 * here so the Redux selector that dereferences
 * `state.settings.config.data.absentWarning` keeps compiling.
 */
export type TAbsentWarningConfig = Record<string, never>;

/**
 * Exam-absence father-warning feature. When enabled, the cron fires
 * once per day at the configured hour/minute and sends the templated
 * SMS to each examinee's `fatherMobile` for every exam that was
 * `delayDays` ago where the student is still flagged absent.
 *
 * Placeholders: `{studentName}`, `{examTitle}`, `{examDate}` (YYYY-MM-DD).
 */
export type TExamAbsenceConfig = {
  enabled: boolean;
  delayDays: number;
  hour: number;
  minute: number;
  message: string;
};

/**
 * Combined envelope returned by `GET /api/v1/settings/config` and
 * accepted by `PUT /api/v1/settings/config`. Both sub-configs are
 * fetched in parallel server-side and presented in one response so the
 * UI can render both cards from a single Redux selector.
 */
export type TSettingsConfig = {
  absentWarning: TAbsentWarningConfig;
  examAbsence: TExamAbsenceConfig;
};

/**
 * Flat patch shape accepted by the server's upsert endpoint. The
 * absent-warning PATCH fields have been removed — that feature is no
 * longer user-configurable. Only the exam-absence fields remain.
 *
 * Every field is optional; the server merges with the stored row and
 * re-validates the merged result before writing.
 */
export type TSettingsConfigPatch = Partial<{
  // exam-absence only
  examAbsenceEnabled: boolean;
  examAbsenceDelayDays: number;
  examAbsenceHour: number;
  examAbsenceMinute: number;
  examAbsenceMessage: string;
}>;

export type TRunAbsentWarningResult = {
  sent: number;
  skipped: number;
  total: number;
  datesProcessed: string[];
};

export type TRunExamAbsenceWarningResult = {
  sent: number;
  skipped: number;
  total: number;
  examsProcessed: { examId: string; title: string; examDate: string }[];
};

/**
 * Single stat line on the public landing-page instructor
 * section (e.g. "10+" / "Years Teaching"). The `value` is a
 * freeform short string the super admin enters verbatim — the
 * shape mirrors the backend `instructorStatSchema` in
 * `settings.validation.ts`.
 */
export type TInstructorStat = {
  value: string;
  label: string;
};

/**
 * Full instructor-section config as returned by
 * `GET /api/v1/settings/public/instructor-section` (public
 * landing page) and `PUT /api/v1/settings/instructor-section`
 * (super-admin Settings page).
 *
 * `quote` is an optional pull-quote rendered under the
 * lead-instructor name. `null` / missing / empty string all
 * mean "don't render the quote block at all" — the server
 * normalises "" to null on write so the public endpoint can
 * distinguish "never set" from "explicitly cleared".
 */
export type TInstructorSection = {
  stats: TInstructorStat[];
  quote?: string | null;
};

/**
 * PATCH shape for the super-admin upsert. The server merges
 * with the stored row + re-validates.
 *
 * `quote` uses `.nullish()` semantics: a `null` or empty
 * string CLEARS the stored quote (the landing page then omits
 * the block); to keep the current value, simply omit the
 * field from the patch. The Settings form sends an empty
 * string for the "clear" action.
 */
export type TInstructorSectionPatch = Partial<{
  stats: TInstructorStat[];
  quote?: string | null;
}>;

/**
 * Frontend mirror of `DEFAULT_INSTRUCTOR_SECTION` on the
 * backend — what the landing page shows before the super admin
 * has saved anything. Kept in sync with the backend so the
 * first deploy renders the same numbers even when the Setting
 * row hasn't been written yet (and so the form can show
 * sensible defaults while the GET is in-flight).
 */
export const DEFAULT_INSTRUCTOR_STATS: TInstructorStat[] = [
  { value: '10+', label: 'Years Teaching' },
  { value: '10000+', label: 'Students Mentored' },
  { value: '2000+', label: 'Placed to Top Universities' },
];

export const DEFAULT_INSTRUCTOR_SECTION: TInstructorSection = {
  stats: DEFAULT_INSTRUCTOR_STATS,
  // Mirrors the backend default so the first paint matches
  // the historical copy until the super admin edits it.
  // Set to `null` to hide the quote block entirely.
  quote:
    "Education isn't about memorising answers — it's about building thinkers. Every student who walks in here deserves a teacher who believes in them first.",
};

/**
 * Pre-baked defaults — the backend returns these too when no row has
 * ever been written. We keep a frontend copy so the form can render
 * sensible values before the GET round-trips.
 *
 * The absent-warning default is an empty object — the service code
 * never reads it.
 */
export const DEFAULT_ABSENT_WARNING_CONFIG: TAbsentWarningConfig = {};

export const DEFAULT_EXAM_ABSENCE_CONFIG: TExamAbsenceConfig = {
  enabled: false,
  delayDays: 2,
  hour: 10,
  minute: 0,
  message:
    'Dear parent, your ward {studentName} was absent from the exam "{examTitle}" held on {examDate}. Please contact the academy.',
};

export const DEFAULT_SETTINGS_CONFIG: TSettingsConfig = {
  absentWarning: DEFAULT_ABSENT_WARNING_CONFIG,
  examAbsence: DEFAULT_EXAM_ABSENCE_CONFIG,
};