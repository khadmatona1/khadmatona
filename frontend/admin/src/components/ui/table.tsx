import type { ReactNode } from "react";
import clsx from "clsx";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="responsive-table overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="bg-surface-muted">{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({
  children,
  className,
  align = "start",
}: {
  children: ReactNode;
  className?: string;
  /** Use this instead of passing `text-end` via `className` - both
   * `text-start`/`text-end` are equal-specificity Tailwind utilities, so
   * whichever one lands later in the compiled stylesheet wins the cascade
   * regardless of class order in the DOM. Baking the choice into one
   * mutually-exclusive prop avoids ever having both classes present on the
   * same element at once. */
  align?: "start" | "end";
}) {
  return (
    <th
      className={clsx(
        "border-b border-border px-4 py-3 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase",
        align === "end" ? "text-end" : "text-start",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-surface-muted">
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Shown as a small heading before this cell's value once the table
   * collapses into stacked cards on narrow screens (see .responsive-table
   * in globals.css) - omit for cells that don't need one (e.g. actions). */
  label?: string;
}) {
  return (
    <td data-label={label} className={clsx("px-4 py-3 text-text", className)}>
      {children}
    </td>
  );
}
