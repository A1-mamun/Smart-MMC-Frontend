/**
 * Two related feature configs that live in the generic `Setting` table
 * on the backend (`absent_warning_sms` and `exam_absence_sms` keys).
 * Mirrors `settings.validation.ts` on the backend.
 */

export type TAbsentWarningMode = "OFF" | "MANUAL" | "AUTO";

export type TWeekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export const WEEKDAYS: TWeekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type TAbsentWarningConfig = {
  mode: TAbsentWarningMode;
  dayOfWeek: TWeekday;
  hour: number;
  minute: number;
  message: string;
  lookbackDays: number;
};

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
 * Flat patch shape accepted by the server's upsert endpoint. The body
 * uses bare names for the absent-warning fields and `examAbsence*` for
 * the new ones — the server projects them onto the right sub-config
 * before persisting.
 *
 * Every field is optional; the server merges with the stored row and
 * re-validates the merged result before writing.
 */
export type TSettingsConfigPatch = Partial<{
  // absent-warning
  mode: TAbsentWarningMode;
  dayOfWeek: TWeekday;
  hour: number;
  minute: number;
  message: string;
  absentMessage: string;
  lookbackDays: number;
  // exam-absence
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
 */
export const DEFAULT_ABSENT_WARNING_CONFIG: TAbsentWarningConfig = {
  mode: "MANUAL",
  dayOfWeek: "Tuesday",
  hour: 10,
  minute: 0,
  message:
    "Dear parent, your ward {studentName} was absent from class on {classDate}. Please ensure regular attendance.",
  lookbackDays: 1,
};

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
