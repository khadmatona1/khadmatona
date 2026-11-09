"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { ChevronDown, Globe } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { setLocaleCookie } from "@/lib/locale";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
];

export function LocaleSwitcher({
  className,
  variant = "default",
}: {
  className?: string;
  /** "onDark"/"onLight" are for permanently-fixed chrome - see ThemeToggle's
   * variant doc for why these use fixed brand colors instead of
   * theme-reactive tokens. "nav" is for the theme-reactive public navbar: a
   * globe icon + current code + chevron trigger opening a small popover,
   * matching that reference design (unlike the other variants' flat
   * inline button row). */
  variant?: "default" | "onDark" | "onLight" | "nav";
}) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleChange(next: Locale) {
    setLocaleCookie(next);
    if (next === locale) return;
    startTransition(() => {
      // Soft, RSC-level re-render - no full page reload, no URL change.
      // Every client component re-reads translations from the refreshed
      // NextIntlClientProvider context automatically.
      router.refresh();
    });
  }

  if (variant === "nav") {
    const current = LOCALES.find((item) => item.code === locale);
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={isPending}
            aria-label={current?.label}
            className={clsx(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.8rem] font-bold text-text-muted transition-colors hover:bg-surface-muted hover:text-text",
              isPending && "opacity-60",
              className,
            )}
          >
            <Globe className="h-4 w-4" />
            {current?.label}
            <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[7rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg outline-none"
          >
            {LOCALES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  handleChange(item.code);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center px-3.5 py-2 text-start text-[0.85rem] font-semibold transition-colors hover:bg-surface-muted",
                  item.code === locale ? "text-gold-primary" : "text-text",
                )}
              >
                {item.label}
              </button>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center text-[0.72rem] font-bold",
        // onDark (the public navbar) matches the reference: bare items with
        // a small gold circle behind the active one, no outer pill/border -
        // default/onLight keep the original bordered-capsule treatment.
        variant === "onDark" ? "gap-2" : "gap-0.5 rounded-full border p-0.5",
        variant === "onLight" && "border-charcoal/20",
        variant === "default" && "border-border-strong",
        isPending && "opacity-60",
        className,
      )}
    >
      {LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => handleChange(item.code)}
          disabled={isPending}
          aria-current={item.code === locale || undefined}
          className={clsx(
            "transition-colors",
            variant === "onDark"
              ? clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  item.code === locale ? "bg-gradient-gold text-white" : "text-white/70 hover:text-white",
                )
              : clsx(
                  "rounded-full px-2.5 py-1",
                  item.code === locale
                    ? "bg-gradient-gold text-white"
                    : variant === "onLight"
                      ? "text-charcoal/70 hover:text-ink"
                      : "text-text-muted hover:text-text",
                ),
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
