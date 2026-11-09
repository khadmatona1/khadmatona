import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Shared "boxed section" building block for every read-only detail popup
 * (lead/property/user/post) - one bordered card per group of facts, with an
 * icon + uppercase label header, instead of each popup hand-rolling its own
 * flat `border-t` dividers. `tone="gold"` is for the one section per popup
 * that deserves to stand out (e.g. a lead's property-request details).
 */
export function DetailSection({
  icon,
  title,
  tone = "neutral",
  children,
}: {
  icon: ReactNode;
  title: string;
  tone?: "neutral" | "gold";
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-md border p-4",
        tone === "gold" ? "border-gold-primary/30 bg-gold-primary/5" : "border-border bg-surface-muted",
      )}
    >
      <p
        className={clsx(
          "mb-3 flex items-center gap-1.5 text-[0.7rem] font-bold tracking-wide uppercase",
          tone === "gold" ? "text-gold-primary" : "text-text-muted",
        )}
      >
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

/** One label/value line inside a `DetailSection`'s `<dl>`. */
export function DetailRow({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center justify-between gap-4", className)}>
      <dt className="flex items-center gap-1.5 text-text-muted">
        {icon}
        {label}
      </dt>
      <dd className="text-end font-semibold text-text">{value}</dd>
    </div>
  );
}
