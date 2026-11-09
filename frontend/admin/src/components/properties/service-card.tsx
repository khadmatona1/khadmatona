import type { ReactNode } from "react";
import clsx from "clsx";
import { Card } from "@/components/ui/card";

export function ServiceCard({
  index,
  icon,
  title,
  description,
  highlight = false,
  compact = false,
  variant = "default",
}: {
  index: number;
  /** When provided, replaces the numbered badge with an icon - used where
   * the cards represent reasons/qualities rather than a numbered sequence. */
  icon?: ReactNode;
  title: string;
  description: string;
  /** Gold border/glow treatment for a single emphasized card in a row
   * (e.g. the first service) - purely additive, every existing call site
   * is unaffected unless it opts in. */
  highlight?: boolean;
  /** Compact, icon-on-top, centered composition (a tight horizontal feature
   * row) instead of the default's taller, start-aligned layout - a layout
   * choice independent of color scheme (see `variant`). */
  compact?: boolean;
  /** "onDark" - fixed dark colors regardless of the site's light/dark
   * toggle, for a permanently-dark backdrop (e.g. the header/hero chrome) -
   * same fixed-chrome pattern as ThemeToggle/LocaleSwitcher/RangeSlider's
   * own "onDark" variants. Independent of `compact` - most callers that
   * want the compact layout still want it theme-reactive (light in light
   * mode), so this defaults to "default". */
  variant?: "default" | "onDark";
}) {
  const isOnDark = variant === "onDark";

  return (
    <Card
      interactive
      radius="md"
      className={clsx(
        "group h-full",
        compact && "flex flex-col items-center !p-4 text-center",
        isOnDark
          ? "!border-white/10 !bg-white/[0.03] hover:!border-gold-primary/50"
          : "hover:border-gold-primary/40",
        highlight && (isOnDark ? "!border-gold-primary shadow-gold" : "border-gold-primary shadow-gold"),
      )}
    >
      {icon ? (
        // `[&>svg]:h-6 [&>svg]:w-6` forces every card's icon to the same
        // size regardless of how it was individually authored (they ranged
        // from h-5 to h-6 across the 6 icons here), and fills the badge
        // box more fully to match its visual weight.
        <span
          className={clsx(
            "flex h-12 w-12 items-center justify-center text-gold-primary transition-colors group-hover:bg-gradient-gold group-hover:text-white [&>svg]:h-7 [&>svg]:w-7",
            compact
              ? "rounded-md border border-gold-primary/30 bg-gold-primary/5"
              : "rounded-full bg-gold-primary/10",
          )}
        >
          {icon}
        </span>
      ) : (
        <span className="font-mono text-sm text-gold-primary">
          {String(index).padStart(2, "0")}
        </span>
      )}
      <span
        className={clsx(
          "block h-px transition-all duration-300 group-hover:w-12 group-hover:bg-gradient-gold",
          compact ? "mt-3 w-8" : "mt-4 w-8",
          isOnDark ? "bg-white/15" : "bg-border",
        )}
      />
      <h3
        className={clsx(
          "font-display font-semibold",
          compact ? "mt-3 text-base" : "mt-4 text-xl",
          isOnDark ? "text-paper" : "text-text",
        )}
      >
        {title}
      </h3>
      <p
        className={clsx(
          "leading-relaxed",
          compact ? "mt-1.5 text-[0.8rem]" : "mt-2 text-[0.92rem]",
          isOnDark ? "text-white/60" : "text-text-muted",
        )}
      >
        {description}
      </p>
    </Card>
  );
}
