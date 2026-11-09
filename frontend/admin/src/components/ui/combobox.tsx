"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/action-icons";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Shown as a small counter next to the option, and appended to the
   * trigger's label once that option is selected. */
  count?: number;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" strokeLinecap="round" />
    </svg>
  );
}

function optionLabel(option: ComboboxOption): string {
  return option.count !== undefined ? `${option.label} (${option.count})` : option.label;
}

/**
 * A searchable dropdown for fields with a potentially long option list
 * (e.g. cities) - unlike a native <select>, options can be filtered by
 * typing, so picking one doesn't require scanning/scrolling a huge list.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  emptyLabel = "No results",
  searchPlaceholder = "Search…",
  variant = "default",
  error,
  expanded = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder: string;
  ariaLabel: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  /** "onDark" is for fixed-dark cards (e.g. the homepage's sell/rent form) -
   * same reasoning as Field/Select/Textarea's own "onDark" variant. The
   * popover content itself never needs a dark variant - it renders through
   * a portal, outside that dark card, so it always follows the page's own
   * light/dark theme like every other popover. */
  variant?: "default" | "onDark";
  error?: string;
  expanded?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const onDark = variant === "onDark";

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  return (
    <div className="flex flex-col gap-2">
      <Popover.Root
        // Give the portalled list its own scroll lock when opened inside a dialog.
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQuery("");
        }}
      >
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            aria-label={ariaLabel}
            className={clsx(
              "flex w-full min-w-0 items-center justify-between gap-2 rounded-sm border-[1.5px] px-3.5 py-2.5 text-start text-[0.95rem] focus-visible:border-gold-primary",
              error ? "border-error" : onDark ? "border-white/15" : "border-border-strong",
              onDark ? "bg-white/5 text-white" : "bg-surface text-text",
              className,
            )}
          >
            <span className={clsx("truncate", !selected && (onDark ? "text-white/60" : "text-text-muted"))}>
              {selected ? optionLabel(selected) : placeholder}
            </span>
            <ChevronDownIcon />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className={clsx("combobox-content z-50 overflow-hidden rounded-md border border-border-strong bg-surface shadow-lg outline-none", expanded ? "w-[max(var(--radix-popover-trigger-width),20rem)] max-w-[calc(100vw-2rem)]" : "w-[var(--radix-popover-trigger-width)]")}
          >
            <div className="relative border-b border-border">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-text-muted">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-transparent py-2.5 ps-9 pe-3 text-[0.9rem] text-text outline-none"
              />
            </div>
            <div className={clsx("overflow-y-auto py-1", expanded ? "max-h-[min(28rem,calc(var(--radix-popover-content-available-height)-3.5rem))]" : "max-h-60")}>
              <ComboboxRow
                label={placeholder}
                selected={value === ""}
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              />
              {filtered.length === 0 ? (
                <p className="px-3.5 py-2.5 text-sm text-text-muted">{emptyLabel}</p>
              ) : (
                filtered.map((option) => (
                  <ComboboxRow
                    key={option.value}
                    label={option.label}
                    count={option.count}
                    selected={value === option.value}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error && (
        <p role="alert" className="text-[0.76rem] font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function ComboboxRow({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start text-[0.9rem] hover:bg-surface-muted",
        selected ? "font-semibold text-gold-primary" : "text-text",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={clsx("shrink-0", !selected && "invisible")}>
          <CheckIcon />
        </span>
        <span className="whitespace-normal break-words">{label}</span>
      </span>
      {count !== undefined && <span className="shrink-0 text-[0.8rem] text-text-muted">{count}</span>}
    </button>
  );
}
