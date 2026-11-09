import type { HTMLAttributes } from "react";
import clsx from "clsx";

// Shared hover-lift treatment for any card-shaped element that needs it
// (PropertyCard, ServiceCard...) - exported so those don't each redefine
// their own copy of the same transition/lift/shadow classes.
export const CARD_INTERACTIVE_CLASSES =
  "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg";

const RADIUS_CLASSES = {
  lg: "rounded-lg",
  md: "rounded-md",
} as const;

export function Card({
  className,
  interactive = false,
  radius = "lg",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  /** "md" (~10px) for a more refined, less rounded look - defaults to the
   * original "lg" (16px) so existing call sites are unaffected. */
  radius?: "lg" | "md";
}) {
  return (
    <div
      className={clsx(
        "min-w-0 border border-border bg-surface p-4 shadow-sm sm:p-6",
        RADIUS_CLASSES[radius],
        interactive && CARD_INTERACTIVE_CLASSES,
        className,
      )}
      {...props}
    />
  );
}
