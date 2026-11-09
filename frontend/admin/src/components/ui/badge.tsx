import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "success" | "warning" | "error" | "info" | "neutral" | "gold";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  error: "bg-error-surface text-error",
  info: "bg-info-surface text-info",
  neutral: "border border-border bg-surface-muted text-text-muted",
  gold: "bg-gold-primary/15 text-gold-primary",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-bold tracking-wide uppercase",
        toneClasses[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
