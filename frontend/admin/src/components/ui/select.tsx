import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { ChevronDownIcon } from "@/components/ui/action-icons";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  /** "onDark" is for fixed-dark cards (e.g. the homepage's sell/rent form)
   * where the theme-reactive default colors wouldn't have enough contrast -
   * same reasoning as Field/Textarea's own "onDark" variant. */
  variant?: "default" | "onDark";
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, variant = "default", id, className, children, ...props }, ref) {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const onDark = variant === "onDark";

    return (
      <div className="flex flex-col gap-2">
        <label
          htmlFor={selectId}
          className={clsx("text-sm font-bold", onDark ? "text-white/85" : "text-text")}
        >
          {label}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? errorId : undefined}
            className={clsx(
              "w-full appearance-none rounded-sm border-[1.5px] ps-3.5 pe-9 py-2.5 text-[0.95rem]",
              "hover:border-gold-primary focus-visible:border-gold-primary",
              onDark ? "bg-white/5 text-white [&>option]:text-ink" : "bg-surface text-text",
              error ? "border-error" : onDark ? "border-white/15" : "border-border-strong",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <span
            className={clsx(
              "pointer-events-none absolute inset-y-0 end-3 flex items-center",
              onDark ? "text-white/60" : "text-text-muted",
            )}
          >
            <ChevronDownIcon />
          </span>
        </div>
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
