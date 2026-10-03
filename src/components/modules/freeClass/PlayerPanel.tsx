"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlayCircle,
  Sparkles,
  Tv,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useLazyGetTopicPlaybackQuery } from "@/redux/features/freeClass/freeClassApi";

import { getProvider } from "./videoProviders";
import type { TFreePlayback } from "@/types/freeClass";

type PlayerContext = {
  topicId: string;
  topicTitle: string;
  // Optional breadcrumb data so the panel can show "Math 1st Paper →
  // Chapter 1 — Vectors → <topic>".
  subjectName?: string;
  chapterTitle?: string;
};

type PlayerPanelProps = {
  /** When null the panel renders the empty / "pick a topic" state. */
  current?: PlayerContext | null;
  /** Adjacent topic titles (for the prev/next button labels). */
  prev?: { title: string } | null;
  next?: { title: string } | null;
  onPrev: () => void;
  onNext: () => void;
  /** Close the player entirely (stops audio, clears state). */
  onClose?: () => void;
};

/**
 * Right-pane video player + prev/next controls + breadcrumb. The
 * container is rendered ONCE per active-topic change so the
 * provider.render() effect mounts a fresh YouTube iframe every time
 * the student hits prev/next — important so the previous video
 * stops playing audio in the background.
 *
 * Autoplay policy: the very first video of the session (auto-played
 * on entry to /free-classes) is started muted because the browser
 * hasn't recorded a user gesture yet. After the student clicks any
 * topic in the sidebar — or any prev/next button — subsequent
 * videos autoplay *with audio* (the click is a valid user gesture).
 */
const PlayerPanel = ({
  current,
  prev,
  next,
  onPrev,
  onNext,
  onClose,
}: PlayerPanelProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [trigger, { data, isFetching, isError, error }] =
    useLazyGetTopicPlaybackQuery();
  // Tracks whether the student has interacted with the page yet. We
  // treat the first /play fetch (the auto-loaded first topic) as
  // "untrusted" — start muted. Any subsequent fetch is the result
  // of a click event, so audio is allowed.
  const hasInteractedRef = useRef(false);
  // Local state mirrors the ref so we can use it in the deps array
  // and force the iframe to re-mount with the new startMuted
  // value when the student interacts.
  const [hasInteracted, setHasInteracted] = useState(false);

  // Mark "interacted" the moment a topic id is set. The first time
  // this fires is the very first content load (auto-played) — but
  // we want THAT one to be muted, so we set the flag AFTER the
  // iframe has had a chance to mount. Subsequent topic changes
  // happen via clicks, and we want THOSE to play with audio.
  //
  // Concretely: when `current` first becomes non-null, we let the
  // first iframe mount muted, then flip the flag so the next mount
  // plays with audio.
  useEffect(() => {
    if (!current) return;
    if (!hasInteractedRef.current) {
      // Defer to the next macrotask so the first iframe's render
      // uses startMuted=true. The flag flip takes effect on the
      // NEXT topic change.
      const t = setTimeout(() => {
        hasInteractedRef.current = true;
        setHasInteracted(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [current?.topicId]);

  // Fetch the playback token whenever the topic changes.
  useEffect(() => {
    if (current) {
      trigger(current.topicId);
    }
  }, [current?.topicId, trigger, current]);

  // Mount the iframe as soon as the playback token arrives. We key
  // the effect on the topicId inside `data` so it re-runs when the
  // resolved payload belongs to a *different* topic — that way a
  // stale (cached) playback response for the previous topic can't
  // leak into the next click, and the new iframe loads with
  // autoplay=1 so the student doesn't have to press play.
  const resolvedTopicId = data?.data?.topicId;
  useEffect(() => {
    if (!data?.data || !containerRef.current) return;
    // Don't mount a stale payload whose topic id no longer matches
    // the currently active topic — RTK Query keeps the previous
    // fetch result around until the new one resolves.
    if (current && resolvedTopicId && resolvedTopicId !== current.topicId) {
      return;
    }
    const playback: TFreePlayback = data.data;
    const provider = getProvider(playback.provider);
    provider.render(playback, containerRef.current, {
      // The first iframe of the session is muted (browser hasn't
      // seen a user gesture yet). All subsequent mounts play with
      // audio because they were triggered by a click.
      startMuted: !hasInteracted,
    });
    return () => provider.teardown(containerRef.current!);
  }, [data, resolvedTopicId, current]);

  // Always tear down on unmount (e.g. parent closes the player).
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
    };
  }, []);

  // Empty state — no topic picked yet.
  if (!current) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
          <Sparkles className="h-8 w-8 text-primary/60" />
          <div>
            <p className="font-medium text-foreground">No topic selected</p>
            <p className="mt-1">
              Pick any topic from the chapter list on the left to start
              watching.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const errMsg =
    (error as { data?: { message?: string } })?.data?.message ||
    "Could not load this video.";

  return (
    <Card className="h-full overflow-hidden">
      <div className="flex h-full flex-col">
        {/* Video area — fixed 16:9 at the top, fills the rest */}
        <div className="relative aspect-video w-full shrink-0 bg-black">
          <div
            ref={containerRef}
            className="absolute inset-0 flex items-center justify-center"
          />
          {isFetching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm">Loading video…</span>
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-6 text-center text-sm text-white">
              {errMsg}
            </div>
          )}
        </div>

        {/* Below the video: title + breadcrumb + prev/next */}
        <CardContent className="flex-1 space-y-3 p-4">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {current.subjectName ? (
              <>
                <span>{current.subjectName}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            ) : null}
            {current.chapterTitle ? (
              <>
                <span className="truncate">{current.chapterTitle}</span>
                <ChevronRight className="h-3 w-3" />
              </>
            ) : null}
            <span className="font-medium text-foreground truncate">
              {current.topicTitle}
            </span>
          </div>

          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PlayCircle className="h-5 w-5 shrink-0 text-primary" />
            <span className="line-clamp-2">{current.topicTitle}</span>
          </h2>

          {/* Prev / next row */}
          <div className="flex items-stretch gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-between"
              onClick={onPrev}
              disabled={!prev}
              aria-label="Previous topic"
              title={prev ? `Previous: ${prev.title}` : "No previous topic"}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="flex-1 truncate px-2 text-left">
                {prev ? (
                  <>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                      Previous
                    </span>
                    <span className="block truncate text-sm font-medium">
                      {prev.title}
                    </span>
                  </>
                ) : (
                  <span className="block text-sm text-muted-foreground">
                    No previous topic
                  </span>
                )}
              </span>
            </Button>
            <Button
              type="button"
              className="flex-1 justify-between"
              onClick={onNext}
              disabled={!next}
              aria-label="Next topic"
              title={next ? `Next: ${next.title}` : "You've reached the end"}
            >
              <span className="flex-1 truncate px-2 text-left">
                {next ? (
                  <>
                    <span className="block text-[10px] uppercase tracking-wider opacity-80">
                      Next
                    </span>
                    <span className="block truncate text-sm font-medium">
                      {next.title}
                    </span>
                  </>
                ) : (
                  <span className="block text-sm">
                    You've reached the end!
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Optional close button — only when the parent provides one */}
          {onClose && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Close player
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default PlayerPanel;

/** Re-export the empty-state icon for completeness. */
export { Tv };