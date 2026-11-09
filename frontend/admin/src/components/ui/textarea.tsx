import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  /** See Field's own "onDark" variant doc - same fixed-dark-card use case. */
  variant?: "default" | "onDark";
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, icon, variant = "default", id, className, ...props }, ref) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;
    const onDark = variant === "onDark";

    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={textareaId}
          className={clsx(
            "flex items-center gap-1.5 text-sm font-bold",
            onDark ? "text-white/85" : "text-text",
          )}
        >
          {icon && (
            <span className={clsx("shrink-0", onDark ? "text-gold-secondary" : "text-gold-primary")}>
              {icon}
            </span>
          )}
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={
            clsx(error && errorId, hint && !error && hintId) || undefined
          }
          className={clsx(
            "min-h-[7rem] w-full resize-y rounded-sm border-[1.5px] px-3.5 py-2.5 text-[0.95rem]",
            "focus-visible:border-gold-primary",
            onDark
              ? "bg-white/5 text-white placeholder:text-white/40"
              : "bg-surface text-text",
            error ? "border-error" : onDark ? "border-white/15" : "border-border-strong",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p className={clsx("text-[0.76rem]", onDark ? "text-white/50" : "text-text-muted")} id={hintId}>
            {hint}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-[0.76rem] font-semibold text-error"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
