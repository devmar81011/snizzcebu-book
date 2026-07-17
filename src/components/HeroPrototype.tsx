"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { BookingCalendar } from "@/components/BookingCalendar";
import { destinationSlides } from "@/lib/destinations";

const SLIDE_MS = 6500;

export function HeroPrototype() {
  const [index, setIndex] = useState(0);
  const active = destinationSlides[index];

  const goTo = useCallback((next: number) => {
    setIndex(
      ((next % destinationSlides.length) + destinationSlides.length) %
        destinationSlides.length,
    );
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % destinationSlides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [index]);

  return (
    <section
      id="top"
      className="relative min-h-dvh overflow-hidden bg-ink text-foam"
    >
      <div className="absolute inset-0">
        {destinationSlides.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.id}
              className={[
                "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
                isActive ? "opacity-100" : "opacity-0",
              ].join(" ")}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                className={[
                  "object-cover object-center",
                  isActive ? "animate-kenburns" : "",
                ].join(" ")}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(6,18,20,0.68)_0%,rgba(6,18,20,0.22)_42%,rgba(6,18,20,0.4)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,18,20,0.58)_0%,transparent_44%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(182,255,46,0.12),transparent_32%)]" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col px-5 pt-8 pb-5 sm:px-8 sm:pt-10 lg:px-10">
        <div className="flex items-start justify-between gap-6">
          <div className="animate-fade-up max-w-lg">
            <Image
              src="/brand/snizzz-logo-clear.png"
              alt="Snizzz Cebu Travel & Tours"
              width={220}
              height={146}
              priority
              unoptimized
              className="mb-5 h-auto w-[min(100%,11rem)] drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] sm:w-[min(100%,13rem)]"
            />
            <p className="mb-3 text-[0.7rem] font-semibold tracking-[0.22em] text-sun uppercase">
              Absolutely no hidden charges
            </p>
            <h1 className="font-[family-name:var(--font-syne)] text-4xl leading-[0.95] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Book Cebu &amp; Bohol
              <span className="mt-2 block text-[0.45em] font-bold tracking-[0.14em] text-white/80 uppercase">
                Day tours in a few taps
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
              Travel in style across the islands — pick a date, choose your
              package, and we handle the rest.
            </p>
            <a
              href="#contact"
              className="mt-5 inline-flex rounded-full border border-white/35 px-5 py-2.5 text-sm font-semibold text-white/95 transition hover:border-sun/70 hover:bg-white/10 hover:text-sun"
            >
              Contact Us
            </a>
          </div>

          <div className="hidden w-full max-w-[22rem] shrink-0 md:block">
            <BookingCalendar
              activePlace={active.place}
              activeIsland={active.island}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-8 pt-16 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div
            className="animate-fade-up max-w-xl"
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-white/55 uppercase">
              {active.island} highlight
            </p>
            <p className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight sm:text-4xl">
              {active.place}
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Next destination
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {destinationSlides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show ${slide.place}`}
                onClick={() => goTo(i)}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-10 bg-sun"
                    : "w-3 bg-white/35 hover:bg-white/60",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 md:hidden">
          <BookingCalendar
            activePlace={active.place}
            activeIsland={active.island}
          />
        </div>
      </div>
    </section>
  );
}
