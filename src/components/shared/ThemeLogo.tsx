"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Render height in pixels. The image keeps its intrinsic aspect ratio
   *  (width auto), so we don't have to know the source dimensions ahead of
   *  time and `width`/`height` don't get out of sync (which triggers
   *  next/image's aspect-ratio warning). */
  height?: number;
  /** Optional extra classes for the wrapper. */
  className?: string;
  /** Accessible label for the logo image. */
  alt?: string;
  /** Optional priority hint for above-the-fold usage. */
  priority?: boolean;
};

/**
 * Theme-aware brand logo.
 *
 * - `logo-light.png` (the colored mark) is shown in light mode.
 * - `logo-dark.png`  (the white mark)   is shown in dark mode.
 *
 * Both <Image> elements are always present and toggled with the `invert-theme`
 * class on the root, which uses Tailwind's `dark:` variant. This avoids any
 * flash when the theme changes because the images are already in the DOM.
 *
 * Mounted state is tracked so we don't render with the wrong theme during SSR
 * (next-themes returns "light" on the server until hydrated).
 */
const ThemeLogo = ({
  height = 32,
  className,
  alt = "MEHEDI MATH",
  priority = false,
}: Props) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // We pass `0` for width so next/image won't fight us over the rendered
  // size — height comes from the wrapper, width stays auto, and the image
  // scales freely with its intrinsic aspect ratio. (Passing a guessed
  // width like height*5 triggers a "width or height modified" warning
  // whenever the real asset isn't 5:1.)

  return (
    <span
      className={cn("relative inline-block", className)}
      style={{ height: mounted ? height : 0 }}
      aria-label={alt}
    >
      {/* Light theme logo */}
      <Image
        src="/logos/logo-light.png"
        alt={alt}
        width={100}
        height={height}
        priority={priority}
        className={cn(
          "h-full w-auto object-contain dark:hidden",
          // Until we know the resolved theme we hide both to avoid a flash of
          // the wrong variant on first paint.
          !mounted && "hidden",
        )}
      />
      {/* Dark theme logo */}
      <Image
        src="/logos/logo-dark.png"
        alt={alt}
        width={100}
        height={height}
        priority={priority}
        className={cn(
          "hidden h-full w-auto object-contain dark:block",
          !mounted && "hidden",
        )}
      />
    </span>
  );
};

export default ThemeLogo;
