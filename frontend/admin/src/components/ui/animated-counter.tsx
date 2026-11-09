"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up from 0 to the numeric part of `value` once it scrolls into
 * view, preserving any non-numeric prefix/suffix (e.g. "20+", "48h",
 * "100%") so it works directly with the existing fake-stat strings.
 */
export function AnimatedCounter({
  value,
  durationMs = 1200,
}: {
  value: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(value.replace(/\d/g, "0"));

  useEffect(() => {
    const match = value.match(/\d+/);
    const node = ref.current;
    if (!match || !node) {
      setDisplay(value);
      return;
    }

    const target = Number(match[0]);
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + match[0].length);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - (1 - progress) ** 3; // ease-out cubic
          const current = Math.round(target * eased);
          setDisplay(`${prefix}${current}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [value, durationMs]);

  return <span ref={ref}>{display}</span>;
}
