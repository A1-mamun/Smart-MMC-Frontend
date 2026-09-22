export type ExamSectionType = "MCQ" | "WRITTEN";

export type TExamSection = {
  id: string;
  type: ExamSectionType;
  name: string;
  totalQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  position: number;
};

export type TCourseLite = {
  id: string;
  name: string;
};

export type TExam = {
  id: string;
  title: string;
  syllabus: string;
  examDate: string;
  courseId: string;
  course?: TCourseLite;
  totalMarks: number;
  isResultPublished: boolean;
  publishedAt?: string | null;
  sections: TExamSection[];
  createdAt: string;
  updatedAt?: string;
  _count?: { results?: number; sections?: number };
};

export type TRosterSectionMark = {
  sectionId: string;
  name: string;
  type: ExamSectionType;
  totalQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  correctAnswers?: number | null;
  obtainedMarks: number;
};

// A non-deleted Batch assignment for the student. We surface the bare fields
// the backend hands us so callers can format them however they like.
export type TStudentBatchLite = {
  id: string;
  batchDay?: string | null;
  batchTime?: string | null;
  hscBatch?: string | null;
};

export type TRosterEntry = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentMobile: string;
  studentCollege?: string | null;
  studentBatches?: TStudentBatchLite[];
  isAbsent: boolean;
  obtainedMarks: number;
  // True once the admin has explicitly saved marks for this student via the
  // Results tab. Drives the "Publish results" gating on the exam detail page.
  marksEntered: boolean;
  rank?: number | null;
  remarks?: string | null;
  sections: TRosterSectionMark[];
};

export type TTopEntry = {
  resultId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  obtainedMarks: number;
  rank: number | null;
};

export type TExamDetail = TExam & {
  roster: TRosterEntry[];
  topTen: TTopEntry[];
  stats: {
    presentCount: number;
    absentCount: number;
    highestMarks: number;
    averageMarks: number;
  };
};

export type TExamListItem = TExam & {
  course: TCourseLite;
  _count: { results: number; sections: number };
};

export type TMyResultSection = {
  sectionId: string;
  name: string;
  type: ExamSectionType;
  obtainedMarks: number;
  totalMarks: number;
};

export type TMyResult = {
  resultId: string;
  examId: string;
  examTitle: string;
  examDate: string;
  courseId: string;
  courseName: string;
  totalMarks: number;
  /**
   * Whether the parent exam's results are published. The
   * `/exam/me/results` endpoint filters server-side to published exams
   * only, but the frontend still gates mark display on this flag as a
   * safety net — if any code path ever relaxes the filter, students
   * won't accidentally see unpublished marks.
   */
  isResultPublished: boolean;
  /**
   * Whether this entry corresponds to a real `ExamResult` row for the
   * student. When `false`, the student is enrolled in the course and
   * the exam is published, but the admin has not yet added the student
   * to that exam's roster. Marks are zeroed in that case and the
   * frontend renders an "awaiting your marks" notice.
   */
  hasResultRow: boolean;
  obtainedMarks: number;
  highestMarks: number;
  rank: number | null;
  sections: TMyResultSection[];
};

/**
 * Per-section summary attached to upcoming exam listings so the student
 * panel's details dialog can render the breakdown (Section / Type /
 * Questions / Marks per question / Total) without a second round-trip.
 * No result marks are surfaced — students should never see other
 * students' marks or personal details through this payload.
 */
export type TMyUpcomingExamSection = {
  id: string;
  type: ExamSectionType;
  name: string;
  totalQuestions: number;
  marksPerQuestion: number;
  totalMarks: number;
  position: number;
};

/**
 * Upcoming exam on a student's enrolled courses. Returned by
 * `GET /exam/me/upcoming` — every exam whose `examDate >= today` is
 * included whether results are published or not, so the student panel
 * can show the full schedule.
 */
export type TMyUpcomingExam = {
  id: string;
  title: string;
  syllabus: string;
  examDate: string;
  isResultPublished: boolean;
  courseId: string;
  courseName: string;
  totalMarks: number;
  sectionCount: number;
  sections: TMyUpcomingExamSection[];
};