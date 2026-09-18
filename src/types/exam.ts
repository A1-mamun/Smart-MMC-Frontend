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
  obtainedMarks: number;
  highestMarks: number;
  rank: number | null;
  sections: TMyResultSection[];
};