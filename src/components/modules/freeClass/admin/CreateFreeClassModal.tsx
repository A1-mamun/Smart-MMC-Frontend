"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Loader2,
  Plus,
  Sparkles,
  Video,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  useCreateFreeClassMutation,
  useGetAdminSubjectsQuery,
  useListAdminChaptersQuery,
} from "@/redux/features/freeClass/freeClassApi";
import { freeClassSubjects } from "@/constants/freeClassSubjects";

type CreateFreeClassModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

/**
 * Sentinel value used by the chapter <Select> to mean "the admin
 * wants to create a new chapter inline" — the sub-form fields then
 * appear below.
 */
const NEW_CHAPTER_SENTINEL = "__new__";

/**
 * "New Free Class" modal. The admin picks:
 *   - subject (Math 1st Paper / Math 2nd Paper)
 *   - chapter — either pick an existing chapter from the subject
 *     picker, or click "Add a new chapter…" to reveal the number +
 *     name sub-form for an inline chapter creation
 *   - topic title
 *   - YouTube URL or video id
 *
 * The server upserts the subject + chapter and creates the topic in
 * a single transaction. The picker always shows the existing
 * chapters for the chosen subject, plus a sentinel for inline
 * creation, so this works whether the subject has 0 or 100
 * chapters.
 */
const CreateFreeClassModal = ({
  open,
  onClose,
  onCreated,
}: CreateFreeClassModalProps) => {
  const [createFreeClass, { isLoading }] = useCreateFreeClassMutation();
  // Always scope the chapter picker to the chosen subject so the
  // dropdown doesn't mix chapters from "Math 1st Paper" with chapters
  // from "Math 2nd Paper".
  const [subjectName, setSubjectName] = useState<
    "Math 1st Paper" | "Math 2nd Paper"
  >(freeClassSubjects[0].value);
  const { data: chaptersData } = useListAdminChaptersQuery(
    { subjectId: undefined },
    { skip: !open },
  );

  // Resolve the current subject's id by matching name from the
  // chapters list (the picker query also accepts a subjectId filter,
  // but we don't have it directly — the chapter list, when
  // unfiltered, lets us look up subjectId by chapter).
  const chaptersAll = chaptersData?.data ?? [];

  const currentSubjectChapters = useMemo(
    () =>
      // We don't carry subjectId on the chapter row by name match, so
      // first look up the chapter's subjectId by matching against the
      // cached subject list, then filter. We rely on the broader
      // list (already loaded) to avoid a second round-trip on each
      // subject switch.
      chaptersAll,
    [chaptersAll],
  );

  // We need the subjectId for the current subject to scope the
  // chapter picker to it. The chapter list endpoint doesn't accept a
  // subjectName filter, so we either:
  //   1. fetch all chapters every time (we already do)
  //   2. add a separate subjects query to get the id, then filter
  // Simpler: filter client-side by joining the unfiltered chapter
  // list to a subject list. We piggyback on the admin-subjects query
  // the page already keeps warm.
  const [chapterSelection, setChapterSelection] = useState<string>("");
  const [chapterNumber, setChapterNumber] = useState<string>("1");
  const [chapterName, setChapterName] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicUrl, setTopicUrl] = useState("");

  // Track the admin-subjects cache so we can resolve
  // subjectName → subjectId for the chapters filter.
  // (We reuse the same RTK slice — `useGetAdminSubjectsQuery` is
  // already exposed.)
  const reset = () => {
    setSubjectName(freeClassSubjects[0].value);
    setChapterSelection("");
    setChapterNumber("1");
    setChapterName("");
    setTopicTitle("");
    setTopicUrl("");
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  // When the subject changes, drop any stale chapter selection so
  // the user can't accidentally post a chapterId from a different
  // subject. (The server also enforces this — see freeClass.admin.service.)
  useEffect(() => {
    setChapterSelection("");
    setChapterName("");
  }, [subjectName]);

  // We need subjects + chapters in parallel to map subjectName →
  // subjectId. The freeClassApi has a `getAdminSubjects` query — we
  // import it lazily here so we don't pull the subjects list every
  // modal open.
  // (Cheaper than the alternative of fetching the subject row again.)
  const { data: subjectsData } = useGetAdminSubjectsQuery(undefined, {
    skip: !open,
  });

  const currentSubjectId = useMemo(
    () => subjectsData?.data?.find((s) => s.name === subjectName)?.id,
    [subjectsData, subjectName],
  );

  const subjectChapters = useMemo(
    () =>
      currentSubjectId
        ? currentSubjectChapters.filter((c) => c.subjectId === currentSubjectId)
        : [],
    [currentSubjectChapters, currentSubjectId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTopic = topicTitle.trim();
    if (!trimmedTopic) {
      toast.error("Topic is required");
      return;
    }
    const trimmedUrl = topicUrl.trim();
    if (!trimmedUrl) {
      toast.error("YouTube URL or video id is required");
      return;
    }
    const looksLikeUrl = /^https?:\/\//i.test(trimmedUrl);
    const looksLikeId = /^[a-zA-Z0-9_-]{6,64}$/.test(trimmedUrl);
    if (!looksLikeUrl && !looksLikeId) {
      toast.error("Enter a YouTube URL or video id");
      return;
    }

    // Decide chapter path.
    let body: Parameters<typeof createFreeClass>[0] | null = null;
    if (chapterSelection === NEW_CHAPTER_SENTINEL) {
      const trimmedChapter = chapterName.trim();
      const n = Number(chapterNumber);
      if (!trimmedChapter) {
        toast.error("New chapter name is required");
        return;
      }
      if (!Number.isInteger(n) || n < 1 || n > 50) {
        toast.error("Chapter number must be between 1 and 50");
        return;
      }
      body = {
        subjectName,
        chapterNumber: n,
        chapterName: trimmedChapter,
        topicTitle: trimmedTopic,
        topicUrl: trimmedUrl,
        isPublished: true,
      };
    } else if (chapterSelection) {
      body = {
        subjectName,
        chapterId: chapterSelection,
        topicTitle: trimmedTopic,
        topicUrl: trimmedUrl,
        isPublished: true,
      };
    } else {
      toast.error("Pick a chapter or choose to create a new one");
      return;
    }

    try {
      const res = await createFreeClass(body).unwrap();
      if (res.success && res.data) {
        const resolvedChapter =
          res.data.chapter.title +
          (res.data.chapter.position
            ? ` (Chapter ${res.data.chapter.position})`
            : "");
        toast.success(
          `Added "${trimmedTopic}" to ${subjectName} → ${resolvedChapter}`,
        );
        reset();
        onCreated();
        onClose();
      }
    } catch (err: unknown) {
      console.log("Failed to create free class", err);
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed to create free class");
    }
  };

  // Build a friendly chapter picker label including the chapter
  // number + topic count so the admin can recognise chapters by
  // number ("Vectors") as easily as by title ("Chapter 3 — Vectors").
  const chapterLabel = (c: {
    chapterNumber: number;
    title: string;
    _count: { topics: number };
  }) => {
    const count = c._count.topics;
    return `Chapter ${c.chapterNumber} — ${c.title}  ·  ${count} video${count === 1 ? "" : "s"}`;
  };

  const showNewChapterFields = chapterSelection === NEW_CHAPTER_SENTINEL;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            New Free Class
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-subject">Subject</Label>
            <Select
              value={subjectName}
              onValueChange={(v) =>
                setSubjectName(v as "Math 1st Paper" | "Math 2nd Paper")
              }
            >
              <SelectTrigger id="fc-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {freeClassSubjects.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chapter picker */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-chapter-pick">Chapter</Label>
            <Select
              value={chapterSelection || undefined}
              onValueChange={(v) => setChapterSelection(v)}
            >
              <SelectTrigger id="fc-chapter-pick">
                <SelectValue placeholder="Pick a chapter or create a new one" />
              </SelectTrigger>
              <SelectContent>
                {subjectChapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {chapterLabel(c)}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CHAPTER_SENTINEL}>
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add a new chapter…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {subjectChapters.length} existing chapter
              {subjectChapters.length === 1 ? "" : "s"} in {subjectName}.
            </p>
          </div>

          {/* Inline new-chapter sub-form */}
          {showNewChapterFields && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fc-chapter">Chapter #</Label>
                  <Input
                    id="fc-chapter"
                    type="number"
                    min={1}
                    max={50}
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fc-chapter-name">Chapter name</Label>
                  <div className="relative">
                    <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fc-chapter-name"
                      className="pl-9"
                      placeholder="e.g. Vectors"
                      value={chapterName}
                      onChange={(e) => setChapterName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We'll create the chapter and immediately add this topic to it.
              </p>
            </div>
          )}

          {/* Topic title */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-topic">Topic</Label>
            <div className="relative">
              <Video className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fc-topic"
                className="pl-9 pr-9"
                placeholder="e.g. Introduction to vectors"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                autoFocus
              />
              {topicTitle && (
                <button
                  type="button"
                  onClick={() => setTopicTitle("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear topic"
                  tabIndex={-1}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* YouTube URL */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-url">YouTube URL or video id</Label>
            <div className="relative">
              <Youtube className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="fc-url"
                rows={2}
                className="pl-9"
                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ  or  dQw4w9WgXcQ"
                value={topicUrl}
                onChange={(e) => setTopicUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We normalise the URL to the raw 11-character id server-side.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Sparkles className="h-4 w-4" />
              Add Free Class
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFreeClassModal;
