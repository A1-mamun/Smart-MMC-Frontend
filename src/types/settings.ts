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