"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Subtle fade+rise on every route change - keyed on the pathname so React
 * remounts (and thus replays the CSS animation on) the wrapped subtree
 * each navigation. Respects prefers-reduced-motion globally (globals.css).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The key-based remount above is what replays the animation, but
  // swapping out the whole subtree also confuses the browser's scroll
  // anchoring - navigating from a scrolled-down list to a shorter page can
  // leave the new page scrolled partway down (or clamped near the bottom)
  // instead of at the top. Force it back explicitly on every navigation
  // rather than relying on Next's own scroll-to-top racing this remount.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
