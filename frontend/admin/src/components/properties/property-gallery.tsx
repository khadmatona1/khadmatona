"use client";

import { useEffect, useRef, useState } from "react";
import { PropertyImage as GalleryImage } from "@/components/properties/property-image";
import type { PropertyImage } from "@/types/property";

// Points toward the start (left in LTR) of the reading direction, and
// mirrors for RTL along with the button's own logical start-2/end-2
// position - a left-pointing "previous" glyph flips to point right once
// the button itself has moved to the physical right edge in RTL.
function ChevronStartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 rtl:-scale-x-100"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronEndIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 rtl:-scale-x-100"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PropertyGallery({
  images,
  title,
  noImageLabel,
  previousImageLabel,
  nextImageLabel,
  landscape = false,
}: {
  images: PropertyImage[];
  title: string;
  noImageLabel: string;
  previousImageLabel: string;
  nextImageLabel: string;
  landscape?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex]);

  function goTo(index: number) {
    setActiveIndex((index + images.length) % images.length);
  }

  // Swipe-to-navigate on mobile - Pointer Events rather than raw Touch
  // Events, since they fire consistently for touch/pen/mouse alike and
  // don't carry the same passive-listener/touch-cancellation quirks across
  // mobile browsers. A plain physical left/right threshold, deliberately
  // not RTL-aware: it already lines up with the chevron buttons' own
  // mirrored start-2/end-2 positions without any special-casing, since
  // both are physical rather than logical.
  function handlePointerDown(event: React.PointerEvent) {
    if (images.length <= 1) return;
    dragStartX.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (dragStartX.current === null) return;
    const deltaX = event.clientX - dragStartX.current;
    const SWIPE_THRESHOLD = 40;
    if (deltaX <= -SWIPE_THRESHOLD) {
      goTo(activeIndex + 1);
    } else if (deltaX >= SWIPE_THRESHOLD) {
      goTo(activeIndex - 1);
    }
    dragStartX.current = null;
  }

  return (
    // Any click inside the gallery counts once per page view as a
    // "gallery" interaction for visitor analytics.
    <div data-analytics-cta="gallery" data-analytics-once>
      <div
        className={`group relative touch-pan-y overflow-hidden rounded-2xl bg-surface-muted select-none ${landscape ? "aspect-[4/3] sm:aspect-[2/1]" : "aspect-square"}`}
        style={{ touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragStartX.current = null;
        }}
      >
        {active ? (
          <GalleryImage src={active.url} alt={title} priority />
        ) : (
          <div className="flex h-full items-center justify-center text-text-muted">
            {noImageLabel}
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label={previousImageLabel}
              className="absolute start-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/50 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 hover:bg-ink/70 focus-visible:opacity-100"
            >
              <ChevronStartIcon />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label={nextImageLabel}
              className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink/50 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 hover:bg-ink/70 focus-visible:opacity-100"
            >
              <ChevronEndIcon />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1">
          {images.map((image, index) => {
            const isActive = image.id === active?.id;

            return (
              <button
                key={image.id}
                ref={(el) => {
                  thumbRefs.current[index] = el;
                }}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`${title} ${index + 1}`}
                aria-current={isActive}
                className={`h-16 w-16 shrink-0 snap-start overflow-hidden rounded-md border-2 transition-colors ${
                  isActive
                    ? "border-gold-primary"
                    : "border-transparent opacity-80 hover:border-border hover:opacity-100"
                }`}
              >
                <GalleryImage src={image.url} alt={`${title} ${index + 1}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
