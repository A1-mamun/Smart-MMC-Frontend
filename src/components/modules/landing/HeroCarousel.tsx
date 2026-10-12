"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBannersQuery } from "@/redux/features/banner/banner.api";
import { TBanner } from "@/types/banner";

/**
 * Landing-page hero carousel, fed by `GET /banner` (the live admin
 * uploads). When the database has zero banners the entire section
 * is omitted from the page — there's no fallback to the old
 * hardcoded slides.
 *
 * Each banner is rendered as a full-bleed image. Only the optional
 * caption (admin-provided) overlays the image — there is no fixed
 * headline, description, or CTA on the banner itself; the marketing
 * copy lives in the sections below the carousel. This keeps the
 * admin-uploaded artwork in full focus and lets the admin's caption
 * be the only text on the slide.
 *
 * Carousel mechanics: 6s auto-cycle, prev/next buttons, dot
 * indicators — all shown only when there's more than one banner.
 * The auto-cycle pauses while the hero is out of view (the user is
 * reading the sections below) — otherwise the cross-fade would keep
 * "flipping" in the user's peripheral vision as they scroll past
 * the hero, which is what made the home page feel like the scroll
 * itself was janky.
 */
const HeroCarousel = () => {
  const { data, isLoading, isError } = useGetBannersQuery();
  const banners: TBanner[] = data?.data ?? [];
  const [active, setActive] = useState(0);
  // Tracks whether the hero section is in the viewport. We pause
  // the auto-cycle when it isn't so the cross-fade doesn't
  // interrupt the user while they're reading the rest of the page.
  const sectionRef = useRef<HTMLElement | null>(null);
  const isInViewRef = useRef(true);

  // Watch the section's visibility. We use `isIntersecting` to
  // gate the auto-cycle below — the carousel is large (h-[820px] on
  // desktop) and the auto-cycle every 6s is visually distracting
  // once the user has scrolled past it.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Auto-cycle. Resets to 0 whenever the banner list shrinks, so
  // we never index past the end of the array. Also ticks only when
  // the hero is in view — see the section above.
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      if (isInViewRef.current) {
        setActive((prev) => (prev + 1) % banners.length);
      }
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goTo = (index: number) => {
    if (banners.length === 0) return;
    if (index < 0) {
      setActive(banners.length - 1);
    } else if (index >= banners.length) {
      setActive(0);
    } else {
      setActive(index);
    }
  };

  // Empty / error: the entire hero section is omitted (no banners
  // configured → no placeholder, just show the page below it).
  if (!isLoading && (isError || banners.length === 0)) {
    return null;
  }

  // Loading: show a same-aspect-ratio skeleton so the page layout
  // doesn't shift when the real banner pops in. Mirrors the real
  // container's height so the sections below stay put.
  if (isLoading) {
    return (
      <section className="relative overflow-hidden">
        <Skeleton className="h-[540px] w-full sm:h-[640px] lg:h-[750px]" />
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div className="relative h-[540px] sm:h-[640px] lg:h-[750px]">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              index === active ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={banner.imageUrl}
              alt={banner.caption || "Banner image"}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
            {/* Bottom gradient so the optional caption stays
                readable; the rest of the image stays unaltered. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Optional caption — the only text on the slide. Only
                rendered when the admin provided one. */}
            {banner.caption && (
              <div className="absolute inset-x-0 bottom-20 z-10 px-4 sm:bottom-24">
                <div className="container mx-auto">
                  <p className="inline-block max-w-2xl rounded-md bg-black/55 px-4 py-2 text-sm font-medium text-white shadow-md backdrop-blur sm:text-base">
                    {banner.caption}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Controls — only show when there's more than one banner.
            With a single banner the controls would be a no-op. */}
        {banners.length > 1 && (
          <>
            <button
              aria-label="Previous slide"
              onClick={() => goTo(active - 1)}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/40 sm:left-6"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next slide"
              onClick={() => goTo(active + 1)}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/40 sm:right-6"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setActive(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === active ? "w-10 bg-white" : "w-2 bg-white/40",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default HeroCarousel;
