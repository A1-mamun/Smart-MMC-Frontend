import type { THscBatch } from "./student";

export type TFreeIntakeMode = "ONLINE" | "OFFLINE";
export type TFreeContentProvider = "YOUTUBE" | "VDOCIPHER" | "FILE";

export type TFreeSignupPayload = {
  name: string;
  mobile: string;
  password: string;
  hscBatch: THscBatch;
  college?: string;
  intakeMode: TFreeIntakeMode;
};

export type TFreeLoginPayload = {
  mobile: string;
  password: string;
};

export type TFreeTopic = {
  id: string;
  title: string;
  position: number;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
};

export type TFreeChapter = {
  id: string;
  title: string;
  position: number;
  // 1-based ordinal unique per subject — drives the sort order in
  // the sidebar ("Ch 1 — Vectors") and lets the player compute
  // prev/next without re-iterating the tree.
  chapterNumber: number;
  topics: TFreeTopic[];
};

export type TFreeSubject = {
  id: string;
  name: string;
  position: number;
  chapters: TFreeChapter[];
};

export type TFreeContentTree = TFreeSubject[];

export type TFreePlayback =
  | {
      provider: "YOUTUBE";
      topicId: string;
      embedUrl: string;
      expiresAt: string | null;
    }
  | {
      provider: "VDOCIPHER";
      topicId: string;
      videoId: string;
      otp: string;
      playbackInfo: string;
      expiresAt: string;
    }
  | {
      provider: "FILE";
      topicId: string;
      signedUrl: string;
      expiresAt: string;
    };

export type TFreeAuthUser = {
  id: string;
  studentId: string;
  mobile: string;
  name: string;
  role: "STUDENT";
  mustChangePassword: boolean;
  isFreeAccount: boolean;
};

export type TFreeStudent = {
  id: string;
  isFreeAccount: boolean;
  freeSignupAt: string | null;
};

export type TFreeAuthResponse = {
  user: TFreeAuthUser;
  student: TFreeStudent;
  accessToken: string;
};

// ─── Admin shapes ────────────────────────────────────────────────────────
// Admins see the full row including providerVideoId / providerEmbedUrl /
// vdoCipherOtp — the public /content endpoint deliberately omits those.

export type TFreeAdminTopic = {
  id: string;
  chapterId: string;
  title: string;
  position: number;
  provider: TFreeContentProvider;
  providerVideoId: string;
  providerEmbedUrl: string | null;
  vdoCipherOtp: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TFreeAdminChapter = {
  id: string;
  subjectId: string;
  title: string;
  position: number;
  // 1-based ordinal unique per subject. Drives the sort order in
  // the accordion and lets admins reference chapters by number in
  // conversations ("Chapter 3" instead of "the one about vectors").
  chapterNumber: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  topics: TFreeAdminTopic[];
};

export type TFreeAdminSubject = {
  id: string;
  name: string;
  position: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  chapters: TFreeAdminChapter[];
};

export type TFreeAdminSubjectInput = {
  name: string;
  position?: number;
  isPublished?: boolean;
};

export type TFreeAdminChapterInput = {
  title: string;
  position?: number;
  isPublished?: boolean;
};

export type TFreeAdminTopicInput = {
  title: string;
  position?: number;
  provider?: TFreeContentProvider;
  providerVideoId: string;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
};

/**
 * Single-step admin create: subject dropdown + chapter number + topic +
 * YouTube URL. The server resolves the subject + chapter by name/number
 * and creates the topic atomically.
 */
export type TFreeAdminCreatePayload = {
  subjectName: 'Math 1st Paper' | 'Math 2nd Paper';
  // Either pick an existing chapter…
  chapterId?: string;
  // …or describe a new one inline. Server enforces exactly one path.
  chapterNumber?: number;
  chapterName?: string;
  topicTitle: string;
  topicUrl: string;
  isPublished?: boolean;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
};

export type TFreeAdminCreateResponse = {
  subject: TFreeAdminSubject;
  chapter: TFreeAdminChapter;
  topic: TFreeAdminTopic;
};

// Used by the create-class modal's chapter picker. Same shape the
// admin tree uses, but lighter (no topics inside) so the picker
// stays small.
export type TFreeAdminChapterOption = {
  id: string;
  subjectId: string;
  title: string;
  position: number;
  chapterNumber: number;
  isPublished: boolean;
  _count: { topics: number };
};