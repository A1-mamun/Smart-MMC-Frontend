"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Tv,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { TFreeSubject, TFreeTopic } from "@/types/freeClass";

type ChapterSidebarProps = {
  subjects: TFreeSubject[];
  /** id of the topic currently playing (highlighted in the list). */
  activeTopicId?: string | null;
  /**
   * Called when the user picks a topic. Receives the full context
   * (subject / chapter / topic) so the parent can compute prev/next
   * and refresh the breadcrumb without re-iterating the tree.
   */
  onSelectTopic: (topic: TFreeTopic, chapter: TFreeSubject["chapters"][number]) => void;
};

/**
 * Left-pane chapter sidebar. Mirrors the Programming Hero class page:
 * each subject is a collapsible group, and inside it every chapter
 * lists its topics as flat rows. The currently-playing topic is
 * highlighted so the student can see where they are in the course.
 *
 * All subjects start expanded. Each chapter header collapses its own
 * group's rows. Position state is local — we don't need to round-trip
 * it through the URL or Redux for this UI.
 */
const ChapterSidebar = ({
  subjects,
  activeTopicId,
  onSelectTopic,
}: ChapterSidebarProps) => {
  // Default-open state: every chapter is expanded by default so the
  // student sees the full curriculum on first load. Stored as a Set
  // of chapter ids.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flat list of all topics across all subjects — used by the
  // "auto-play next" logic in the parent. We don't render it as a
  // separate flat view because the grouped-by-chapter layout reads
  // better.
  if (subjects.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <Tv className="h-8 w-8 text-primary/60" />
        <p>No free classes available right now.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="space-y-2">
            {/* Subject heading */}
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {subject.name}
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>

            {subject.chapters.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No chapters yet.
              </p>
            ) : (
              <div className="space-y-1">
                {subject.chapters.map((chapter) => {
                  const isOpen = !collapsed.has(chapter.id);
                  return (
                    <div
                      key={chapter.id}
                      className="rounded-md border bg-card"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(chapter.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold transition hover:bg-muted/60"
                      >
                        <span className="flex items-center gap-2">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-mono text-xs text-muted-foreground">
                            Ch {chapter.chapterNumber}
                          </span>
                          <span className="line-clamp-1">
                            {chapter.title}
                          </span>
                        </span>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                        >
                          {chapter.topics.length}
                        </Badge>
                      </button>
                      {isOpen && (
                        <ul className="border-t px-1 pb-1">
                          {chapter.topics.length === 0 ? (
                            <li className="px-3 py-2 text-xs italic text-muted-foreground">
                              No topics yet.
                            </li>
                          ) : (
                            chapter.topics.map((topic) => {
                              const isActive = topic.id === activeTopicId;
                              return (
                                <li key={topic.id}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectTopic(topic, chapter)
                                    }
                                    className={cn(
                                      "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition",
                                      isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted",
                                    )}
                                  >
                                    <PlayCircle
                                      className={cn(
                                        "mt-0.5 h-4 w-4 shrink-0",
                                        isActive
                                          ? "text-primary-foreground"
                                          : "text-primary/70",
                                      )}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={cn(
                                          "font-medium leading-snug",
                                          isActive && "text-primary-foreground",
                                        )}
                                      >
                                        {topic.title}
                                      </p>
                                      {topic.durationSeconds ? (
                                        <p
                                          className={cn(
                                            "mt-0.5 text-[10px]",
                                            isActive
                                              ? "text-primary-foreground/80"
                                              : "text-muted-foreground",
                                          )}
                                        >
                                          {formatDuration(topic.durationSeconds)}
                                        </p>
                                      ) : null}
                                    </div>
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default ChapterSidebar;

/**
 * Compute a flat list of all topics in the order the student should
 * play them: subject 0 → chapter 0 → topic 0, then topic 1, … then
 * chapter 1, …, until subject 1 (Math 2nd Paper) and so on.
 *
 * Used by the parent to derive the prev/next buttons and to render a
 * breadcrumb.
 */
export const flattenFreeTopics = (
  subjects: TFreeSubject[],
): Array<{
  subject: TFreeSubject;
  chapter: TFreeSubject["chapters"][number];
  topic: TFreeTopic;
}> => {
  const out: Array<{
    subject: TFreeSubject;
    chapter: TFreeSubject["chapters"][number];
    topic: TFreeTopic;
  }> = [];
  for (const subject of subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        out.push({ subject, chapter, topic });
      }
    }
  }
  return out;
};