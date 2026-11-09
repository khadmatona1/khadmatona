"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useEffect } from "react";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 3.5h9L19 8v12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 3.5V8H19" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12.5v4M12 10.5v6M16 14v2.5" strokeLinecap="round" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Owner Portal's own sidebar - same off-canvas drawer mechanics as the
 * Admin/Commercial Sidebar (components/layout/sidebar.tsx), just with the
 * two routes an Owner actually has (Overview, Monthly reports) instead of
 * that component's Admin/Commercial branching.
 */
export function OwnerSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("OwnerPortal");
  const nav = useTranslations("Nav");

  const items = [
    { href: "/owner", label: t("navOverview"), icon: <HomeIcon /> },
    { href: "/owner/reports", label: t("navReports"), icon: <ReportIcon /> },
    { href: "/owner/revenue", label: t("navRevenue"), icon: <RevenueIcon /> },
  ];

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-40 bg-ink/50 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={clsx(
          "fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col gap-1 overflow-y-auto bg-ink p-5 text-white/70",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "max-lg:-translate-x-full max-lg:rtl:translate-x-full",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:max-w-none",
        )}
      >
        <div className="mb-4 flex items-center justify-between px-2">
          <Link
            href="/owner"
            onClick={onClose}
            className="font-display text-xl font-semibold text-white transition-opacity hover:opacity-80"
          >
            {nav("brand")}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={nav("closeMenu")}
            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-gold-primary/18 text-gold-secondary"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </aside>
    </>
  );
}
