"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Edit,
  Eye,
  Loader2,
  Plus,
  Power,
  Sparkles,
  Trash2,
  Tv,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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
  useCreateChapterMutation,
  useCreateSubjectMutation,
  useCreateTopicMutation,
  useDeleteChapterMutation,
  useDeleteSubjectMutation,
  useDeleteTopicMutation,
  useGetAdminSubjectsQuery,
  useLazyPreviewTopicQuery,
  useUpdateChapterMutation,
  useUpdateSubjectMutation,
  useUpdateTopicMutation,
} from "@/redux/features/freeClass/freeClassApi";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import FreeClassViewer from "../FreeClassViewer";
import CreateFreeClassModal from "./CreateFreeClassModal";
import type {
  TFreeAdminChapter,
  TFreeAdminChapterInput,
  TFreeAdminSubject,
  TFreeAdminSubjectInput,
  TFreeAdminTopic,
  TFreeAdminTopicInput,
  TFreeContentProvider,
} from "@/types/freeClass";

/**
 * Admin CRUD for the free-class content tree. Layout:
 *   - Top: list of subjects (with "New Subject" button + reorder/edit/delete)
 *   - Per subject: a chapter list with inline new-chapter input + per-chapter
 *     topic list with new-topic input + edit/delete buttons.
 *
 * The form fields use a controlled <Input> instead of react-hook-form
 * because the surface area is small (name/title/url/position) and the
 * dialog lifecycle is simpler when we can `useState` the form values
 * alongside the open/close state.
 */

const FreeClassAdminPage = () => {
  const user = useAppSelector(useCurrentUser);
  const { data, isLoading, refetch } = useGetAdminSubjectsQuery();
  // Manual trigger for the admin preview iframe. The PreviewModal
  // child component also calls useLazyPreviewTopicQuery to render
  // the iframe; this parent hook just kicks the fetch off so the
  // modal gets a resolved payload by the time it mounts.
  const [triggerPreview] = useLazyPreviewTopicQuery();
  const [createSubject] = useCreateSubjectMutation();
  const [updateSubject] = useUpdateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();
  const [createChapter] = useCreateChapterMutation();
  const [updateChapter] = useUpdateChapterMutation();
  const [deleteChapter] = useDeleteChapterMutation();
  const [createTopic] = useCreateTopicMutation();
  const [updateTopic] = useUpdateTopicMutation();
  const [deleteTopic] = useDeleteTopicMutation();

  const subjects = data?.data ?? [];
  const publishedCount = useMemo(
    () =>
      subjects.reduce(
        (acc, s) =>
          acc +
          s.chapters.reduce(
            (a, c) => a + c.topics.filter((t) => t.isPublished).length,
            0,
          ) +
          (s.isPublished ? 1 : 0),
        0,
      ),
    [subjects],
  );

  // Subject modal
  const [subjectModal, setSubjectModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; subject: TFreeAdminSubject }
    | null
  >(null);
  // Chapter modal
  const [chapterModal, setChapterModal] = useState<
    | { mode: "create"; subjectId: string }
    | { mode: "edit"; chapter: TFreeAdminChapter }
    | null
  >(null);
  // Topic modal
  const [topicModal, setTopicModal] = useState<
    | { mode: "create"; chapterId: string }
    | { mode: "edit"; topic: TFreeAdminTopic }
    | null
  >(null);

  // Preview modal
  const [previewing, setPreviewing] = useState<{
    topicId: string;
    title: string;
  } | null>(null);

  // "Student View" overlay — lets admins (non-students) preview exactly
  // what a student sees on /free-classes without leaving the dashboard.
  const [studentViewOpen, setStudentViewOpen] = useState(false);

  // Simplified "New Free Class" modal — primary CTA. Replaces the
  // previous 3-step subject → chapter → topic flow with a single form.
  const [createFreeClassOpen, setCreateFreeClassOpen] = useState(false);

  // Subject picker — shown when "New Chapter" is clicked from the
  // header and there are multiple subjects to disambiguate.
  const [subjectPickerForChapterOpen, setSubjectPickerForChapterOpen] =
    useState(false);

  // Custom confirmation modal — replaces the blocking `window.confirm()`
  // for the per-row delete actions (subject / chapter / topic) so the
  // warning matches the dashboard's design tokens and stays keyboard-
  // accessible.
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirmDialog();

  // ─── Subject handlers ────────────────────────────────────────────────
  const handleDeleteSubject = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: `Delete subject "${name}"?`,
      description:
        "This also deletes every chapter + topic under it. Students who have already watched these videos will keep their watch history, but new enrollments won't be possible.",
      detail: "Subject + chapters + topics",
      confirmLabel: "Delete subject",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteSubject(id).unwrap();
      toast.success("Subject deleted");
      refetch();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed to delete");
    }
  };

  const handleTogglePublished = async (s: TFreeAdminSubject) => {
    try {
      await updateSubject({
        id: s.id,
        data: { isPublished: !s.isPublished },
      }).unwrap();
      toast.success(s.isPublished ? "Subject unpublished" : "Subject published");
      refetch();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed");
    }
  };

  // ─── Chapter handlers ───────────────────────────────────────────────
  const handleDeleteChapter = async (id: string, title: string) => {
    const ok = await confirmAction({
      title: `Delete chapter "${title}"?`,
      description: "This also deletes every topic under it. Watch history on those topics is preserved but the videos themselves are removed.",
      detail: "Chapter + topics",
      confirmLabel: "Delete chapter",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteChapter(id).unwrap();
      toast.success("Chapter deleted");
      refetch();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed to delete");
    }
  };

  const handleToggleChapterPublished = async (c: TFreeAdminChapter) => {
    try {
      await updateChapter({
        id: c.id,
        data: { isPublished: !c.isPublished },
      }).unwrap();
      toast.success(
        c.isPublished ? "Chapter unpublished" : "Chapter published",
      );
      refetch();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed");
    }
  };

  // ─── Topic handlers ─────────────────────────────────────────────────
  const handleDeleteTopic = async (id: string, title: string) => {
    const ok = await confirmAction({
      title: `Delete topic "${title}"?`,
      description: "The video and its watch history are removed from the topic. Students who already viewed it won't be recharged.",
      detail: "Topic video",
      confirmLabel: "Delete topic",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteTopic(id).unwrap();
      toast.success("Topic deleted");
      refetch();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed to delete");
    }
  };

  const handleToggleTopicPublished = async (t: TFreeAdminTopic) => {
    try {
      await updateTopic({
        id: t.id,
        data: { isPublished: !t.isPublished },
      }).unwrap();
      toast.success(
        t.isPublished ? "Topic unpublished" : "Topic published",
      );
      refetch();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Failed");
    }
  };

  const handlePreview = async (t: TFreeAdminTopic) => {
    setPreviewing({ topicId: t.id, title: t.title });
    try {
      await triggerPreview(t.id).unwrap();
    } catch (err: unknown) {
      const typed = err as { data?: { message?: string } };
      toast.error(typed.data?.message || "Preview failed");
      setPreviewing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            Free Classes
          </h2>
          <p className="text-sm text-muted-foreground">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} ·{" "}
            {publishedCount} published item{publishedCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* "Student View" — only shown to admins (non-students). Lets
              the admin see exactly what a student sees on /free-classes
              without leaving the dashboard. Hidden completely for students
              because they ARE the student view. */}
          {user?.role !== "STUDENT" && (
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => setStudentViewOpen(true)}
              title="Preview the student-facing free classes page"
            >
              <Eye className="h-4 w-4" />
              Student View
            </Button>
          )}
          <Button
            onClick={() => setCreateFreeClassOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            New Free Class
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // When there's only one subject, default to it. With
              // multiple subjects, open a sub-picker so the admin
              // can choose which subject the new chapter belongs
              // to (avoids accidental cross-subject creation).
              if (subjects.length === 1) {
                setChapterModal({
                  mode: "create",
                  subjectId: subjects[0].id,
                });
              } else if (subjects.length > 1) {
                setSubjectPickerForChapterOpen(true);
              }
            }}
            disabled={subjects.length === 0}
            title={
              subjects.length === 0
                ? "Create a subject first"
                : "Create a chapter"
            }
          >
            <Plus className="h-4 w-4" /> New Chapter
          </Button>
          <Button
            variant="outline"
            onClick={() => setSubjectModal({ mode: "create" })}
          >
            <Plus className="h-4 w-4" /> New Subject
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Tv className="h-8 w-8 text-primary/60" />
            <p>
              No subjects yet. Create one (e.g. “HSC 1st Paper”) to start
              building the content tree.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={() => setSubjectModal({ mode: "edit", subject })}
              onDelete={() => handleDeleteSubject(subject.id, subject.name)}
              onTogglePublished={() => handleTogglePublished(subject)}
              onAddChapter={() =>
                setChapterModal({ mode: "create", subjectId: subject.id })
              }
              onEditChapter={(c) =>
                setChapterModal({ mode: "edit", chapter: c })
              }
              onDeleteChapter={(c) => handleDeleteChapter(c.id, c.title)}
              onToggleChapterPublished={(c) => handleToggleChapterPublished(c)}
              onAddTopic={(chapterId) =>
                setTopicModal({ mode: "create", chapterId })
              }
              onEditTopic={(t) => setTopicModal({ mode: "edit", topic: t })}
              onDeleteTopic={(t) => handleDeleteTopic(t.id, t.title)}
              onToggleTopicPublished={(t) => handleToggleTopicPublished(t)}
              onPreviewTopic={(t) => handlePreview(t)}
            />
          ))}
        </div>
      )}

      {subjectModal && (
        <SubjectModal
          state={subjectModal}
          onClose={() => setSubjectModal(null)}
          onSubmit={async (values) => {
            try {
              if (subjectModal.mode === "create") {
                await createSubject(values as TFreeAdminSubjectInput).unwrap();
                toast.success("Subject created");
              } else {
                await updateSubject({
                  id: subjectModal.subject.id,
                  data: values,
                }).unwrap();
                toast.success("Subject updated");
              }
              setSubjectModal(null);
              refetch();
            } catch (err: unknown) {
              const typed = err as { data?: { message?: string } };
              toast.error(typed.data?.message || "Failed");
            }
          }}
        />
      )}

      {chapterModal && (
        <ChapterModal
          state={chapterModal}
          onClose={() => setChapterModal(null)}
          onSubmit={async (values) => {
            try {
              if (chapterModal.mode === "create") {
                await createChapter({
                  subjectId: chapterModal.subjectId,
                  data: values as TFreeAdminChapterInput,
                }).unwrap();
                toast.success("Chapter created");
              } else {
                await updateChapter({
                  id: chapterModal.chapter.id,
                  data: values,
                }).unwrap();
                toast.success("Chapter updated");
              }
              setChapterModal(null);
              refetch();
            } catch (err: unknown) {
              const typed = err as { data?: { message?: string } };
              toast.error(typed.data?.message || "Failed");
            }
          }}
        />
      )}

      {topicModal && (
        <TopicModal
          state={topicModal}
          onClose={() => setTopicModal(null)}
          onSubmit={async (values) => {
            try {
              if (topicModal.mode === "create") {
                await createTopic({
                  chapterId: topicModal.chapterId,
                  data: values as TFreeAdminTopicInput,
                }).unwrap();
                toast.success("Topic created");
              } else {
                await updateTopic({
                  id: topicModal.topic.id,
                  data: values,
                }).unwrap();
                toast.success("Topic updated");
              }
              setTopicModal(null);
              refetch();
            } catch (err: unknown) {
              const typed = err as { data?: { message?: string } };
              toast.error(typed.data?.message || "Failed");
            }
          }}
        />
      )}

      {previewing && (
        <PreviewModal
          topicId={previewing.topicId}
          title={previewing.title}
          onClose={() => setPreviewing(null)}
        />
      )}

      {/* Student-view overlay — renders the same FreeClassViewer the
          public /free-classes route uses. Modal state only; the dialog
          itself doesn't remount the underlying admin page data fetch. */}
      <Dialog
        open={studentViewOpen}
        onOpenChange={(v) => {
          if (!v) setStudentViewOpen(false);
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] max-h-[85vh] gap-0 overflow-hidden p-0 flex flex-col">
          <DialogHeader className="border-b bg-muted/40 px-5 py-2.5 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" />
                Student View — Free Classes
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setStudentViewOpen(false)}
                aria-label="Close student view"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-background p-4">
            <FreeClassViewer />
          </div>
        </DialogContent>
      </Dialog>

      <CreateFreeClassModal
        open={createFreeClassOpen}
        onClose={() => setCreateFreeClassOpen(false)}
        onCreated={() => refetch()}
      />

      {subjectPickerForChapterOpen && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v) setSubjectPickerForChapterOpen(false);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create chapter for which subject?</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {subjects.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    setChapterModal({
                      mode: "create",
                      subjectId: s.id,
                    });
                    setSubjectPickerForChapterOpen(false);
                  }}
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.chapters.length} chapter
                    {s.chapters.length === 1 ? "" : "s"}
                  </span>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {confirmDialog}
    </div>
  );
};

export default FreeClassAdminPage;

// ─── Subject card ─────────────────────────────────────────────────────────

type SubjectCardProps = {
  subject: TFreeAdminSubject;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onAddChapter: () => void;
  onEditChapter: (c: TFreeAdminChapter) => void;
  onDeleteChapter: (c: TFreeAdminChapter) => void;
  onToggleChapterPublished: (c: TFreeAdminChapter) => void;
  onAddTopic: (chapterId: string) => void;
  onEditTopic: (t: TFreeAdminTopic) => void;
  onDeleteTopic: (t: TFreeAdminTopic) => void;
  onToggleTopicPublished: (t: TFreeAdminTopic) => void;
  onPreviewTopic: (t: TFreeAdminTopic) => void;
};

const SubjectCard = ({
  subject,
  onEdit,
  onDelete,
  onTogglePublished,
  onAddChapter,
  onEditChapter,
  onDeleteChapter,
  onToggleChapterPublished,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onToggleTopicPublished,
  onPreviewTopic,
}: SubjectCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
      <div>
        <CardTitle className="flex items-center gap-2">
          {subject.name}
          <Badge variant={subject.isPublished ? "success" : "secondary"}>
            {subject.isPublished ? "Published" : "Draft"}
          </Badge>
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {subject.chapters.length} chapter
          {subject.chapters.length === 1 ? "" : "s"} · position {subject.position}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={onAddChapter}>
          <Plus className="h-4 w-4" /> Chapter
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit className="h-4 w-4" /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={onTogglePublished}>
          <Power className="h-4 w-4" />
          {subject.isPublished ? "Unpublish" : "Publish"}
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {subject.chapters.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No chapters yet. Click “+ Chapter” to add the first one.
        </p>
      ) : (
        <div className="space-y-3">
          {subject.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="rounded-md border bg-muted/30 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                    {chapter.position + 1}
                  </span>
                  <h4 className="text-sm font-semibold">{chapter.title}</h4>
                  <Badge
                    variant={chapter.isPublished ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {chapter.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddTopic(chapter.id)}
                  >
                    <Plus className="h-4 w-4" /> Topic
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditChapter(chapter)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleChapterPublished(chapter)}
                    title={
                      chapter.isPublished ? "Unpublish" : "Publish"
                    }
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteChapter(chapter)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {chapter.topics.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  No topics yet.
                </p>
              ) : (
                <ul className="mt-3 divide-y rounded-md border bg-background">
                  {chapter.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary/70" />
                        <span className="text-sm font-medium">
                          {topic.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {topic.provider}
                        </Badge>
                        {topic.isPublished ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPreviewTopic(topic)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditTopic(topic)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onToggleTopicPublished(topic)}
                          title={
                            topic.isPublished ? "Unpublish" : "Publish"
                          }
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteTopic(topic)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── Subject modal ────────────────────────────────────────────────────────

type SubjectModalProps = {
  state:
    | { mode: "create" }
    | { mode: "edit"; subject: TFreeAdminSubject };
  onClose: () => void;
  onSubmit: (values: Partial<TFreeAdminSubjectInput>) => Promise<void> | void;
};

const SubjectModal = ({ state, onClose, onSubmit }: SubjectModalProps) => {
  const editing = state.mode === "edit" ? state.subject : null;
  const [name, setName] = useState(editing?.name ?? "");
  const [position, setPosition] = useState<number>(editing?.position ?? 0);
  const [isPublished, setIsPublished] = useState<boolean>(
    editing?.isPublished ?? false,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        position: Number(position) || 0,
        isPublished,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit subject" : "New subject"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject-name">Name</Label>
            <Input
              id="subject-name"
              placeholder="e.g. HSC 1st Paper"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject-position">Position</Label>
            <Input
              id="subject-position"
              type="number"
              min={0}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Lower number shows first in the tab strip.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Published (visible to free-class students)
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Chapter modal ───────────────────────────────────────────────────────

type ChapterModalProps = {
  state:
    | { mode: "create"; subjectId: string }
    | { mode: "edit"; chapter: TFreeAdminChapter };
  onClose: () => void;
  onSubmit: (
    values: Partial<TFreeAdminChapterInput> & { subjectId?: string }
  ) => Promise<void> | void;
};

const ChapterModal = ({ state, onClose, onSubmit }: ChapterModalProps) => {
  const editing = state.mode === "edit" ? state.chapter : null;
  const [subjectId, setSubjectId] = useState<string>(
    editing
      ? editing.subjectId
      : state.mode === "create"
        ? state.subjectId
        : "",
  );
  const [title, setTitle] = useState(editing?.title ?? "");
  // Chapter number is the new canonical name for the field. The
  // backend still mirrors it into `position` for the accordion
  // sort order, but the UI now uses the clearer "Chapter number"
  // label.
  const [chapterNumber, setChapterNumber] = useState<number>(
    editing?.chapterNumber ?? editing?.position ?? 1,
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    editing?.isPublished ?? false,
  );
  const [saving, setSaving] = useState(false);

  // Subject dropdown source. Read directly from the admin cache so
  // the modal is always in sync with the page-level state.
  const { data: subjectsData } = useGetAdminSubjectsQuery();
  const subjects = subjectsData?.data ?? [];
  const subjectName =
    subjects.find((s) => s.id === subjectId)?.name ?? "—";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Chapter name is required");
      return;
    }
    if (!subjectId) {
      toast.error("Subject is required");
      return;
    }
    if (
      !Number.isInteger(chapterNumber) ||
      chapterNumber < 1 ||
      chapterNumber > 50
    ) {
      toast.error("Chapter number must be between 1 and 50");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        subjectId,
        title: trimmedTitle,
        position: chapterNumber,
        isPublished,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit chapter" : "New chapter"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject dropdown — disabled in edit mode (the subject
              for an existing chapter is immutable to avoid breaking
              the student landing). */}
          <div className="space-y-1.5">
            <Label htmlFor="chapter-subject">Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => setSubjectId(v)}
              disabled={!!editing}
            >
              <SelectTrigger id="chapter-subject">
                <SelectValue placeholder="Pick a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {editing
                ? "Subject is locked for existing chapters."
                : "The chapter belongs to the selected subject."}
            </p>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="chapter-number">Chapter #</Label>
              <Input
                id="chapter-number"
                type="number"
                min={1}
                max={50}
                value={chapterNumber || ""}
                onChange={(e) =>
                  setChapterNumber(Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chapter-title">Chapter name</Label>
              <Input
                id="chapter-title"
                placeholder="e.g. Vectors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Chapter numbers are unique per subject.{" "}
            {subjectName !== "—" ? (
              <>
                <span className="font-mono">{subjectName}</span> can use any
                number from 1 to 50.
              </>
            ) : (
              <>Pick a subject first to see which numbers are taken.</>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Published
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Topic modal ─────────────────────────────────────────────────────────

type TopicModalProps = {
  state:
    | { mode: "create"; chapterId: string }
    | { mode: "edit"; topic: TFreeAdminTopic };
  onClose: () => void;
  onSubmit: (values: Partial<TFreeAdminTopicInput>) => Promise<void> | void;
};

const TopicModal = ({ state, onClose, onSubmit }: TopicModalProps) => {
  const editing = state.mode === "edit" ? state.topic : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [provider, setProvider] = useState<TFreeContentProvider>(
    editing?.provider ?? "YOUTUBE",
  );
  // We hold the raw input the admin types (could be a full URL or raw id)
  // and normalise on submit. The service extracts the id server-side.
  const [providerVideoId, setProviderVideoId] = useState(
    editing?.providerVideoId ?? "",
  );
  const [duration, setDuration] = useState<string>(
    editing?.durationSeconds != null ? String(editing.durationSeconds) : "",
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    editing?.thumbnailUrl ?? "",
  );
  const [position, setPosition] = useState<number>(editing?.position ?? 0);
  const [isPublished, setIsPublished] = useState<boolean>(
    editing?.isPublished ?? false,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!providerVideoId.trim()) {
      toast.error("Video id or URL is required");
      return;
    }
    if (provider === "YOUTUBE") {
      // Server normalises the URL/id; just sanity-check it isn't
      // obviously invalid.
      const looksLikeUrl = /^https?:\/\//i.test(providerVideoId.trim());
      const looksLikeId = /^[a-zA-Z0-9_-]{6,64}$/.test(
        providerVideoId.trim(),
      );
      if (!looksLikeUrl && !looksLikeId) {
        toast.error("Enter a YouTube URL or video id");
        return;
      }
    }
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        provider,
        providerVideoId: providerVideoId.trim(),
        durationSeconds: duration ? Number(duration) : null,
        thumbnailUrl: thumbnailUrl.trim() || null,
        position: Number(position) || 0,
        isPublished,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit topic" : "New topic"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic-title">Title</Label>
            <Input
              id="topic-title"
              placeholder="e.g. Introduction to vectors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="topic-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as TFreeContentProvider)}
              >
                <SelectTrigger id="topic-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YOUTUBE">YouTube (v1)</SelectItem>
                  <SelectItem value="VDOCIPHER" disabled>
                    VdoCipher (coming soon)
                  </SelectItem>
                  <SelectItem value="FILE" disabled>
                    Self-hosted file (coming soon)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-position">Position</Label>
              <Input
                id="topic-position"
                type="number"
                min={0}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topic-videoId">YouTube URL or video id</Label>
            <Textarea
              id="topic-videoId"
              rows={2}
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ  or  dQw4w9WgXcQ"
              value={providerVideoId}
              onChange={(e) => setProviderVideoId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Either paste the full URL or the 11-character video id. We
              normalise it server-side.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="topic-duration">Duration (sec)</Label>
              <Input
                id="topic-duration"
                type="number"
                min={0}
                placeholder="e.g. 540"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="topic-thumb">Thumbnail URL (optional)</Label>
              <Input
                id="topic-thumb"
                type="url"
                placeholder="https://…"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Published (visible to free-class students)
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Preview modal ───────────────────────────────────────────────────────

const PreviewModal = ({
  topicId,
  title,
  onClose,
}: {
  topicId: string;
  title: string;
  onClose: () => void;
}) => {
  // RTK Query lazy queries to take the args at trigger time, not at
  // hook time — calling useLazyPreviewTopicQuery(topicId) makes the
  // hook try to use `topicId` as a SubscriptionOptions object and
  // blows up the type inference. Get the trigger function and pass
  // the topicId when we actually want to fetch.
  const [trigger, { data, isFetching, isError }] = useLazyPreviewTopicQuery();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fire the fetch whenever the topicId changes.
  useEffect(() => {
    trigger(topicId);
  }, [topicId, trigger]);

  // Mount the YouTube iframe when the preview token arrives.
  useEffect(() => {
    if (!data?.data || !containerRef.current) return;
    const playback = data.data;
    containerRef.current.replaceChildren();
    if (playback.provider === "YOUTUBE") {
      const iframe = document.createElement("iframe");
      iframe.src = playback.embedUrl;
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.className = "h-full w-full rounded-md border-0";
      containerRef.current.appendChild(iframe);
    }
    return () => {
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [data]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/40 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-primary" />
              Preview: {title}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="relative aspect-video w-full bg-black">
          <div ref={containerRef} className="absolute inset-0" />
          {isFetching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white">
              Could not load preview.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};