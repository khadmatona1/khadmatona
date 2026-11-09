"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ShieldCheck, Star } from "lucide-react";
import type { GoogleReview } from "@/types/reviews";

/** Google's official 4-color "G" mark - brand colors are fixed, not
 * recolorable via `currentColor` like the monochrome social icons
 * elsewhere in this app. */
export function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/** Google's Places API caps `reviews` at 5 entries with no pagination, so
 * this only ever scrolls through what the backend actually returned - "See
 * all reviews" links out to the real Maps listing instead of pretending to
 * paginate past Google's own limit. */
export function TestimonialsCarousel({ reviews }: { reviews: GoogleReview[] }) {
  const t = useTranslations("Testimonials");
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    const card = track?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleScroll() {
      if (!track) return;
      const trackLeft = track.getBoundingClientRect().left;
      let closest = 0;
      let closestDistance = Infinity;
      Array.from(track.children).forEach((child, index) => {
        const distance = Math.abs(child.getBoundingClientRect().left - trackLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = index;
        }
      });
      setActiveIndex(closest);
    }

    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
        aria-label={t("previous")}
        disabled={activeIndex === 0}
        className="absolute start-0 top-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md transition-opacity hover:bg-surface-muted disabled:opacity-40 rtl:rotate-180 sm:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => scrollToIndex(Math.min(reviews.length - 1, activeIndex + 1))}
        aria-label={t("next")}
        disabled={activeIndex === reviews.length - 1}
        className="absolute end-0 top-1/2 z-10 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md transition-opacity hover:bg-surface-muted disabled:opacity-40 rtl:rotate-180 sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review, index) => (
          <article
            key={`${review.author_name}-${index}`}
            className="flex w-[85%] shrink-0 snap-start flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)]"
          >
            <div className="flex items-center justify-between">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-sm font-bold text-text-muted">
                {review.profile_photo_url ? (
                  <Image
                    src={review.profile_photo_url}
                    alt=""
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  review.author_name.charAt(0)
                )}
              </span>
              <GoogleGIcon className="h-5 w-5 shrink-0" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-0.5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star
                    key={star}
                    className={clsx(
                      "h-4 w-4",
                      star < review.rating ? "fill-gold-primary text-gold-primary" : "text-border-strong",
                    )}
                  />
                ))}
              </div>
              <p className="font-display text-base font-semibold text-text">{review.author_name}</p>
              {review.relative_time_description && (
                <p className="text-[0.78rem] text-text-muted">{review.relative_time_description}</p>
              )}
            </div>
            <p className="line-clamp-4 text-[0.9rem] leading-relaxed text-text-muted">{review.text}</p>
            <p className="mt-auto flex items-center gap-1.5 text-[0.76rem] font-semibold text-text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-primary" />
              {t("verifiedBadge")}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {reviews.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollToIndex(index)}
            aria-label={t("goToReview", { number: index + 1 })}
            className={clsx(
              "h-2 rounded-full transition-all",
              index === activeIndex ? "w-6 bg-gold-primary" : "w-2 bg-border-strong",
            )}
          />
        ))}
      </div>
    </div>
  );
}
