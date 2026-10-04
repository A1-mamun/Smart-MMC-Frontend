import type { TFreePlayback } from "@/types/freeClass";

/**
 * Provider-agnostic video renderer so swapping YouTube (v1) → VdoCipher
 * (paid flow) is a one-line change. The discriminated `TFreePlayback`
 * carries every field each provider needs; the modal calls `getProvider`
 * and lets the implementation own its own DOM.
 *
 * Important: teardown MUST remove every element the provider created so
 * that closing the modal doesn't leave a YouTube iframe playing audio in
 * the background.
 */
export interface VideoProviderRenderOptions {
  /**
   * Whether the video should start muted. Pass true for the very
   * first video the student watches in a session — browsers refuse
   * autoplay-with-audio until the user has interacted with the
   * page, so the *first* iframe (which loads before the student has
   * clicked anything on the free-classes page) needs to be silent.
   * After the student clicks any topic in the sidebar, the next
   * iframe can autoplay with audio (the click satisfies the user
   * gesture requirement).
   */
  startMuted?: boolean;
}

export interface VideoProvider {
  render: (
    playback: TFreePlayback,
    container: HTMLElement,
    options?: VideoProviderRenderOptions,
  ) => void;
  // Container can be null if the React component unmounts before its
  // effect cleanup runs (e.g. the player modal closes mid-render).
  // Providers must guard before touching it.
  teardown: (container: HTMLElement | null) => void;
}

export const youtubeProvider: VideoProvider = {
  render(playback, container, options) {
    if (playback.provider !== "YOUTUBE") return;
    const iframe = document.createElement("iframe");
    // `autoplay=1` so the video starts the moment the admin picks a
    // topic — students shouldn't have to press play. The first
    // click in the sidebar counts as a user gesture so Chrome /
    // Safari / Firefox all allow audio autoplay from then on.
    //
    // `playsinline=1` keeps the video from forcing full-screen on
    // mobile Safari when it auto-plays inside the inline iframe.
    let src = playback.embedUrl;
    const sep = src.includes("?") ? "&" : "?";
    const muted = options?.startMuted ? "1" : "0";
    src += `${sep}autoplay=1&mute=${muted}&playsinline=1&rel=0`;
    iframe.src = src;
    iframe.title = "Free class video";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.className = "h-full w-full rounded-md border-0";
    container.appendChild(iframe);
  },
  teardown(container) {
    container?.replaceChildren();
  },
};

// VdoCipher and FILE providers are stubs for v1. When the paid flow goes
// live we'll mint OTPs server-side and either spin up VdoCipher's player
// SDK here or render a signed <video> tag.
export const vdoCipherProvider: VideoProvider = {
  render(_playback, container) {
    const note = document.createElement("div");
    note.className = "rounded-md border bg-muted p-4 text-sm text-muted-foreground";
    note.textContent =
      "VdoCipher playback is coming soon for paid courses. Free classes currently use YouTube.";
    container.appendChild(note);
  },
  teardown(container) {
    container?.replaceChildren();
  },
};

export const fileProvider: VideoProvider = {
  render(_playback, container) {
    const note = document.createElement("div");
    note.className = "rounded-md border bg-muted p-4 text-sm text-muted-foreground";
    note.textContent = "Self-hosted file playback is coming soon.";
    container.appendChild(note);
  },
  teardown(container) {
    container?.replaceChildren();
  },
};

export function getProvider(p: TFreePlayback["provider"]): VideoProvider {
  switch (p) {
    case "YOUTUBE":
      return youtubeProvider;
    case "VDOCIPHER":
      return vdoCipherProvider;
    case "FILE":
      return fileProvider;
  }
}