"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Tv } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { useGetFreeContentQuery } from "@/redux/features/freeClass/freeClassApi";

import ChapterSidebar, { flattenFreeTopics } from "./ChapterSidebar";
import PlayerPanel from "./PlayerPanel";
import type {
  TFreeChapter,
  TFreeSubject,
  TFreeTopic,
} from "@/types/freeClass";

type FreeClassViewerProps = {
  /** Display name shown in the welcome card (e.g. user.name). */
  welcomeName?: string;
};

/**
 * Split-view free-class content: chapter sidebar on the left,
 * video player + prev/next on the right. The first topic in the
 * tree (subject 0 → chapter 0 → topic 0) auto-plays as soon as the
 * content loads.
 *
 * State is keyed off an `activeIndex` into the flattened topic list
 * so prev/next are O(1) without re-iterating the tree.
 */
const FreeClassViewer = ({ welcomeName }: FreeClassViewerProps) => {
  const { data, isLoading, isError, refetch } = useGetFreeContentQuery();
  const subjects = useMemo<TFreeSubject[]>(() => data?.data ?? [], [data?.data]);

  // Defensive timeout: if the content API hasn't returned within
  // 8 s we stop showing the spinner and let the user retry. RTK
  // Query does not surface a built-in timeout, so a hung request
  // (e.g. backend cold-start, network blip) would otherwise leave
  // a Loader2 on screen forever — the symptom users reported as
  // "loading spinner all the time".
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), 8_000);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  // Flat list of every topic in playback order.
  const flat = useMemo(() => flattenFreeTopics(subjects), [subjects]);

  // Index into `flat` of the currently playing topic. `null` means
  // "nothing selected" — which can only happen transiently during
  // the initial loading phase.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Auto-pick the first topic once the content arrives. We also
  // restore from `window.location.hash` so a shared link opens to
  // the right topic.
  useEffect(() => {
    if (flat.length === 0) {
      if (activeIndex !== null) setActiveIndex(null);
      return;
    }
    // First-time load with no hash → start at 0.
    if (activeIndex === null && !window.location.hash) {
      setActiveIndex(0);
      return;
    }
    // Restore from hash if present.
    if (activeIndex === null && window.location.hash) {
      const id = window.location.hash.slice(1);
      const idx = flat.findIndex((f) => f.topic.id === id);
      setActiveIndex(idx >= 0 ? idx : 0);
      return;
    }
    // Hash changed externally (back/forward) → re-sync.
    if (activeIndex !== null && window.location.hash) {
      const id = window.location.hash.slice(1);
      const idx = flat.findIndex((f) => f.topic.id === id);
      if (idx >= 0 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat.length]);

  // Sync the URL hash whenever the active topic changes (without
  // triggering a re-render of the tree-loading effect above).
  useEffect(() => {
    if (activeIndex === null) return;
    const topic = flat[activeIndex];
    if (!topic) return;
    const newHash = `#${topic.topic.id}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [activeIndex, flat]);

  // Keyboard shortcuts: ← / J → prev, → / L → next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing inside form fields.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable
        ) {
          return;
        }
      }
      if (activeIndex === null) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "j") {
        if (activeIndex > 0) setActiveIndex(activeIndex - 1);
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "l") {
        if (activeIndex < flat.length - 1) setActiveIndex(activeIndex + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, flat.length]);

  if (isLoading && !timedOut) {
    return (
      <div className="flex min-h-[400px] items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (timedOut || isError || subjects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
          <Tv className="h-8 w-8 text-primary/60" />
          <p>
            {timedOut
              ? "Still loading… the server is taking longer than expected."
              : "No free classes available right now. Check back soon — we're uploading new chapters every week."}
          </p>
          <button
            type="button"
            onClick={() => {
              setTimedOut(false);
              refetch();
            }}
            className="mt-2 inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  const current = activeIndex !== null ? flat[activeIndex] : undefined;
  const prev = activeIndex !== null && activeIndex > 0 ? flat[activeIndex - 1] : null;
  const next =
    activeIndex !== null && activeIndex < flat.length - 1
      ? flat[activeIndex + 1]
      : null;

  const onSelectById = (topicId: string) => {
    const idx = flat.findIndex((f) => f.topic.id === topicId);
    if (idx >= 0) setActiveIndex(idx);
  };

  return (
    <div className="space-y-4">
      {/* Welcome strip — collapses once the student starts watching */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold sm:text-xl">
              {welcomeName
                ? `Welcome, ${welcomeName.split(" ")[0]}!`
                : "Free HSC classes"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Pick any topic from the chapter list, or press{" "}
              <kbd className="rounded border bg-muted px-1 text-[10px]">
                →
              </kbd>{" "}
              to move to the next video.
            </p>
          </div>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border bg-card shadow-sm lg:h-[calc(100vh-200px)] lg:min-h-[520px]">
          <ChapterSidebar
            subjects={subjects}
            activeTopicId={current?.topic.id}
            onSelectTopic={(topic) => onSelectById(topic.id)}
          />
        </div>
        <div className="lg:h-[calc(100vh-200px)] lg:min-h-[520px]">
          <PlayerPanel
            current={
              current
                ? {
                    topicId: current.topic.id,
                    topicTitle: current.topic.title,
                    subjectName: current.subject.name,
                    chapterTitle: current.chapter.title,
                  }
                : null
            }
            prev={prev ? { title: prev.topic.title } : null}
            next={next ? { title: next.topic.title } : null}
            onPrev={() => {
              if (activeIndex !== null && activeIndex > 0) {
                setActiveIndex(activeIndex - 1);
              }
            }}
            onNext={() => {
              if (activeIndex !== null && activeIndex < flat.length - 1) {
                setActiveIndex(activeIndex + 1);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FreeClassViewer;
export type { TFreeChapter, TFreeSubject, TFreeTopic };