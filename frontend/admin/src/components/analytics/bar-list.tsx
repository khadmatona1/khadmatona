import type { ReactNode } from "react";

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Right-hand text; defaults to the formatted value. */
  display?: string;
  /** Muted text under the label (e.g. "12 conversions"). */
  hint?: string;
}

/**
 * Labeled horizontal bars in one hue, for ranked categories (traffic
 * sources, devices, funnel stages). Every bar carries its label and value
 * as text, so identity never depends on color. `max` lets a funnel scale
 * every stage against its first stage.
 */
export function BarList({
  items,
  max,
  emptyLabel,
}: {
  items: BarListItem[];
  max?: number;
  emptyLabel: string;
}) {
  const scale = Math.max(max ?? Math.max(...items.map((item) => item.value), 0), 1);

  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.key} title={`${typeof item.label === "string" ? item.label : item.key}: ${item.display ?? item.value}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-text">{item.label}</span>
            <span className="shrink-0 font-mono font-semibold text-text tabular-nums">{item.display ?? item.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-primary to-gold-secondary rtl:bg-gradient-to-l"
              style={{ width: `${Math.max(item.value > 0 ? 2 : 0, (item.value / scale) * 100)}%` }}
            />
          </div>
          {item.hint && <p className="mt-1 text-[0.72rem] text-text-muted">{item.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
