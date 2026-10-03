/**
 * Display labels for the free-class subject picker. The backend stores
 * subjects as free-form strings (admin-curated), so these labels are
 * the canonical menu options the admin sees when creating a new
 * chapter/topic. The actual FreeSubject rows are auto-created on first
 * use — no separate "create subject" step needed.
 */
export const freeClassSubjects = [
  { value: "Math 1st Paper", label: "Math 1st Paper" },
  { value: "Math 2nd Paper", label: "Math 2nd Paper" },
] as const;

export type TFreeClassSubjectValue = (typeof freeClassSubjects)[number]["value"];