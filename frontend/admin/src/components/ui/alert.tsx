import type { ReactNode } from "react";
import clsx from "clsx";

type Tone = "success" | "warning" | "error" | "info";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-surface border-success/30 text-success",
  warning: "bg-warning-surface border-warning/30 text-warning",
  error: "bg-error-surface border-error/30 text-error",
  info: "bg-info-surface border-info/30 text-info",
};

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5m0-5-5 5" strokeLinecap="round" />
    </svg>
  );
}

function InfoCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

const toneIcons: Record<Tone, () => ReactNode> = {
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  error: XCircleIcon,
  info: InfoCircleIcon,
};

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const Icon = toneIcons[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "flex items-start gap-3 rounded-md border px-4 py-3.5 text-sm shadow-sm",
        toneClasses[tone],
      )}
    >
      <Icon />
      <div>
        {title && <strong className="mb-0.5 block">{title}</strong>}
        <div className="text-text">{children}</div>
      </div>
    </div>
  );
}
