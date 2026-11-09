"use client";

import { useId, useState, type PointerEvent } from "react";

export interface TrendPoint {
  /** Axis/tooltip label for this point (e.g. "24 sept."). */
  label: string;
  value: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PAD_TOP = 8;

/**
 * Single-series area/line chart for one metric over time. Used as small
 * multiples (visitors, page views, leads each get their own chart) rather
 * than one chart with several y-scales. Dependency-free SVG like the
 * dashboard's existing BarChart/DonutChart. The one gold hue matches them.
 *
 * Hover/touch anywhere on the plot shows a crosshair + tooltip for the
 * nearest day. The screen-reader table carries the same numbers.
 */
export function TrendChart({
  data,
  title,
  formatValue = (value) => String(value),
}: {
  data: TrendPoint[];
  title: string;
  formatValue?: (value: number) => string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...data.map((point) => point.value), 1);
  const step = data.length > 1 ? WIDTH / (data.length - 1) : 0;
  const x = (index: number) => (data.length > 1 ? index * step : WIDTH / 2);
  const y = (value: number) => PAD_TOP + (HEIGHT - PAD_TOP) * (1 - value / max);

  const line = data.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`).join(" ");
  const area = data.length > 0 ? `${line} L${x(data.length - 1)},${HEIGHT} L${x(0)},${HEIGHT} Z` : "";

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (data.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let ratio = (event.clientX - rect.left) / rect.width;
    // The plot is drawn left-to-right in both directions (time runs
    // left-to-right on every chart in this app), so no RTL flip here.
    ratio = Math.min(1, Math.max(0, ratio));
    setActive(Math.round(ratio * (data.length - 1)));
  }

  const activePoint = active !== null ? data[active] : null;
  const activeLeft = active !== null ? (x(active) / WIDTH) * 100 : 0;
  const activeTop = activePoint ? (y(activePoint.value) / HEIGHT) * 100 : 0;
  const middle = Math.floor((data.length - 1) / 2);

  return (
    <figure className="flex flex-col gap-2" dir="ltr">
      <div className="flex items-baseline justify-between text-[0.68rem] text-text-muted">
        <span className="font-mono tabular-nums">{formatValue(max)}</span>
      </div>
      <div
        className="relative h-40 w-full touch-pan-y"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActive(null)}
        role="img"
        aria-label={title}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-gold-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-gold-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={0}
              x2={WIDTH}
              y1={PAD_TOP + (HEIGHT - PAD_TOP) * fraction}
              y2={PAD_TOP + (HEIGHT - PAD_TOP) * fraction}
              stroke="var(--color-border)"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line x1={0} x2={WIDTH} y1={HEIGHT} y2={HEIGHT} stroke="var(--color-border-strong)" vectorEffect="non-scaling-stroke" />
          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="var(--color-gold-primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={HEIGHT}
              stroke="var(--color-text-muted)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {activePoint && (
          <>
            <span
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-gold-primary"
              style={{ left: `${activeLeft}%`, top: `${activeTop}%` }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md"
              style={{ left: `${Math.min(88, Math.max(12, activeLeft))}%` }}
            >
              <p className="text-text-muted">{activePoint.label}</p>
              <p className="font-mono font-semibold text-text tabular-nums">{formatValue(activePoint.value)}</p>
            </div>
          </>
        )}
      </div>
      {data.length > 0 && (
        <div className="flex justify-between font-mono text-[0.68rem] text-text-muted">
          <span>{data[0].label}</span>
          {data.length > 2 && <span>{data[middle].label}</span>}
          {data.length > 1 && <span>{data[data.length - 1].label}</span>}
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{formatValue(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
