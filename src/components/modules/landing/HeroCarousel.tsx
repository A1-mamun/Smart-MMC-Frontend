"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = {
  id: number;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  highlights: string[];
  accent: string;
};

const SLIDES: Slide[] = [
  {
    id: 1,
    eyebrow: "Smart NFC Attendance",
    title: "Tap. Track. Transform.",
    description:
      "A modern coaching ecosystem where students tap into class, parents see real-time progress, and teachers focus on what matters — learning.",
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1600&q=80",
    highlights: ["Live NFC readers", "Instant SMS to guardians", "Auto attendance ledger"],
    accent: "from-sky-500/80 via-cyan-400/70 to-blue-600/80",
  },
  {
    id: 2,
    eyebrow: "HSC Batch 26 · 27 · 28",
    title: "Where Toppers Are Made.",
    description:
      "From HSC 1st year to final preparation — guided by a RUET CSE graduate with a passion for results.",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    highlights: ["HSC 1st Year", "HSC 2nd Year", "HSC Final Prep", "Admission Program"],
    accent: "from-violet-500/80 via-fuchsia-400/70 to-rose-500/80",
  },
  {
    id: 3,
    eyebrow: "Parents Stay in the Loop",
    title: "Transparency You Can Trust.",
    description:
      "Payment ledger, exam results and attendance — every milestone reaches the guardian the moment it does.",
    image:
      "https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1600&q=80",
    highlights: ["Guardian SMS portal", "Payment history", "Exam analytics"],
    accent: "from-emerald-500/80 via-teal-400/70 to-cyan-500/80",
  },
];

const HeroCarousel = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    if (index < 0) {
      setActive(SLIDES.length - 1);
    } else if (index >= SLIDES.length) {
      setActive(0);
    } else {
      setActive(index);
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[560px] sm:h-[620px] lg:h-[680px]">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-in-out",
              index === active ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br mix-blend-multiply",
                slide.accent,
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            <div className="container relative z-10 mx-auto flex h-full items-center px-4">
              <div className="max-w-3xl text-white">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium uppercase tracking-widest backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{slide.eyebrow}</span>
                </div>
                <h1 className="text-4xl font-extrabold leading-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base text-white/90 sm:text-lg">
                  {slide.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {slide.highlights.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="rounded-full px-6">
                    <Link href="/signin">
                      <GraduationCap className="h-4 w-4" />
                      <span>Start Learning</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-white/10 px-6 text-white hover:bg-white/20 hover:text-white"
                  >
                    <Link href="#contact">Talk to Us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Controls */}
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

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setActive(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                index === active ? "w-10 bg-white" : "w-2 bg-white/40",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;