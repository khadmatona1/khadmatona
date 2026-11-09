"use client";

import * as Slider from "@radix-ui/react-slider";
import clsx from "clsx";

export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  formatValue,
  variant = "default",
  compact = false,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Fires once when the thumb is released (or a key adjustment finishes),
   * not on every intermediate value while dragging - use this to trigger
   * anything expensive (e.g. an API call) instead of onChange. */
  onCommit?: (value: [number, number]) => void;
  formatValue: (value: number) => string;
  /** "onDark" - for use over a fixed dark backdrop (e.g. the home hero's
   * image overlay) that doesn't follow the site's light/dark theme toggle,
   * same reason hero-search.tsx's own labels hardcode text-white instead of
   * the theme-aware text-text tokens. */
  variant?: "default" | "onDark";
  /** Drops the caption above the track always, and the min/max value row
   * below the track from the `sm` breakpoint up - hero-search.tsx (the only
   * caller that sets this) shows that same range in its own field label
   * instead once past `sm`, where every field shares one inline row; below
   * `sm` fields stack as their own full-width rows, so the value row stays.
   * `label` still backs the thumbs' aria-label either way. */
  compact?: boolean;
}) {
  const isOnDark = variant === "onDark";

  return (
    <div className={clsx("flex flex-col", compact ? "gap-1" : isOnDark ? "gap-2" : "gap-3")}>
      {!compact && (
        <span
          className={clsx(
            isOnDark
              ? "text-[0.72rem] font-extrabold tracking-[0.04em] text-white/70"
              : "text-sm font-bold text-text",
          )}
        >
          {label}
        </span>
      )}
      <Slider.Root
        className="relative flex h-5 w-full touch-none items-center"
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(next) => onChange([next[0], next[1]])}
        onValueCommit={(next) => onCommit?.([next[0], next[1]])}
        minStepsBetweenThumbs={1}
      >
        <Slider.Track
          className={clsx(
            "relative h-1.5 grow rounded-full",
            isOnDark ? "bg-white/25" : "bg-border-strong",
          )}
        >
          <Slider.Range className="absolute h-full rounded-full bg-gradient-gold" />
        </Slider.Track>
        <Slider.Thumb
          className={clsx(
            "block h-[18px] w-[18px] rounded-full border-2 border-gold-primary shadow-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-gold-primary/40 focus-visible:outline-none",
            isOnDark ? "bg-white" : "bg-surface",
          )}
          aria-label={`${label} min`}
        />
        <Slider.Thumb
          className={clsx(
            "block h-[18px] w-[18px] rounded-full border-2 border-gold-primary shadow-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-gold-primary/40 focus-visible:outline-none",
            isOnDark ? "bg-white" : "bg-surface",
          )}
          aria-label={`${label} max`}
        />
      </Slider.Root>
      <div
        className={clsx(
          "flex justify-between",
          compact ? "text-[0.66rem] sm:hidden" : "text-[0.8rem]",
          isOnDark ? "font-extrabold text-white/70" : "font-semibold text-text-muted",
        )}
      >
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
    </div>
  );
}
