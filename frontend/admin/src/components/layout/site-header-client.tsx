"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import { Mail, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { LogoMark } from "@/components/layout/logo-mark";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import type { Settings } from "@/types/settings";

interface NavItem {
  href: string;
  label: string;
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M12 3.5 5 6v5.5c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6l-7-2.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2.2 2.2L15.5 10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M12 21c-1.6 0-3.1-.4-4.4-1.1L4 21l1.1-3.5A8.9 8.9 0 1 1 12 21Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.3c0-.5.4-1 1-1h.6c.3 0 .5.2.6.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c.4.9 1.1 1.6 2 2l.6-.5c.2-.1.4-.2.6-.1l1.5.6c.3.1.4.4.4.6v.6c0 .6-.5 1-1 1-3.5 0-6.3-2.8-6.3-6.3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Desktop-only: clicking gives a choice of Call / Email / WhatsApp in a
 * dropdown, since a desktop visitor isn't necessarily reachable by tapping a
 * `tel:` link. The mobile equivalent (see the `lg:hidden` controls group
 * below) skips the menu and links straight to `tel:` instead.
 */
function ContactMenu({ settings }: { settings: Settings }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const hasPhone = Boolean(settings.contact_phone);
  const hasEmail = Boolean(settings.contact_email);
  const hasWhatsapp = Boolean(settings.social_whatsapp);
  if (!hasPhone && !hasEmail && !hasWhatsapp) return null;

  const itemClassName =
    "flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-muted hover:text-text";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("contactUs")}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-gold-primary/30 text-text-muted transition-colors hover:border-green-500 hover:bg-green-500 hover:text-white"
      >
        <Phone className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+0.5rem)] z-50 flex w-56 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-xl"
        >
          {hasPhone && (
            <a
              role="menuitem"
              href={`tel:${settings.contact_phone!.replace(/\s+/g, "")}`}
              onClick={() => setOpen(false)}
              className={itemClassName}
            >
              <Phone className="h-4 w-4 text-gold-primary" />
              {t("call")}
            </a>
          )}
          {hasEmail && (
            <a
              role="menuitem"
              href={`mailto:${settings.contact_email}`}
              onClick={() => setOpen(false)}
              className={itemClassName}
            >
              <Mail className="h-4 w-4 text-gold-primary" />
              {t("sendEmail")}
            </a>
          )}
          {hasWhatsapp && (
            <a
              role="menuitem"
              href={settings.social_whatsapp!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={itemClassName}
            >
              <WhatsAppIcon className="h-4 w-4 text-gold-primary" />
              {t("whatsapp")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function SiteHeaderClient({ settings }: { settings: Settings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useTranslations("Nav");
  const ux = useTranslations("PublicUx");
  const { user } = useAuth();
  const isAdmin = Boolean(user?.roles?.includes("Admin"));

  const items: NavItem[] = [
    { href: "/properties", label: t("properties") },
    { href: "/reserver", label: t("bookStay") },
    { href: "/services", label: t("services") },
    { href: "/blog", label: t("blog") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
  ];

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, []);

  // Body scroll lock while the mobile drawer is open - a premium detail
  // that also prevents the page from scrolling "through" the overlay.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <a
        href="#main-content"
        className="sr-only fixed start-3 top-3 z-[100] rounded-lg bg-surface p-3 text-text focus:not-sr-only"
      >
        {ux("skipContent")}
      </a>
      <header className="sticky top-0 z-40 border-b border-gold-primary/20 bg-surface-deep text-text shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-5 lg:px-6">
          <Link
            href="/"
            aria-label={`${t("brand")} ${t("brandSuffix")}`}
            className="flex shrink-0 items-center transition-opacity hover:opacity-85"
            onClick={() => setOpen(false)}
          >
            <LogoMark className="h-12 w-auto shrink-0 sm:h-16 lg:h-[4.5rem]" />
          </Link>

          <nav
            aria-label={t("mainNavigation")}
            className="hidden items-center gap-6 text-sm font-semibold lg:flex"
          >
            {items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "relative flex items-center gap-1.5 py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-[1px] after:h-[2px] after:origin-center after:scale-x-0 after:bg-gradient-gold after:transition-transform after:duration-300 hover:after:scale-x-100",
                    active
                      ? "text-gold-primary after:scale-x-100"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex h-9 items-center rounded-md border border-gold-primary/30 px-1">
              <ThemeToggle variant="default" />
            </div>
            <div className="flex h-9 items-center rounded-md border border-gold-primary/30 px-1">
              <LocaleSwitcher variant="nav" />
            </div>
            <ContactMenu settings={settings} />
            {isAdmin && (
              <Link
                href="/dashboard"
                aria-label={t("administration")}
                title={t("administration")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition-all hover:border-gold-primary hover:text-gold-primary"
              >
                <ShieldIcon />
              </Link>
            )}
            <Link
              href="/register-property"
              data-analytics-cta="header_sell_rent"
            >
              <Button size="sm">
                <Plus className="h-4 w-4" />
                {t("propertyRequest")}
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
            <div className="flex h-9 items-center rounded-md border border-gold-primary/30 px-1">
              <ThemeToggle variant="default" />
            </div>
            <div className="flex h-9 items-center rounded-md border border-gold-primary/30 px-1">
              <LocaleSwitcher variant="nav" />
            </div>
            {settings.contact_phone && (
              <a
                href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
                aria-label={t("call")}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gold-primary/30 text-text-muted transition-colors hover:border-green-500 hover:bg-green-500 hover:text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label={t("openMenu")}
                aria-expanded={open}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gold-primary/30 text-text transition-colors hover:bg-surface-muted"
              >
                <MenuIcon />
              </button>
            </Dialog.Trigger>
          </div>
        </div>

        {/* Mobile drawer - overlay/slide-in/Escape-close, RTL-aware (slides
          from the trailing edge via `end-0`, and the closed-state
          transform direction flips via the `rtl:` variant). Theme-reactive
          to match the theme-reactive header chrome. */}
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-[2px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 end-0 z-50 flex w-80 max-w-[90vw] flex-col gap-1 overflow-y-auto bg-surface p-5 text-text shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-display text-lg font-semibold text-text">
                {t("menu")}
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
              >
                <CloseIcon />
              </button>
            </div>
            <nav aria-label={t("mobileMenu")} className="flex flex-col gap-1">
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-gold-primary/15 text-gold-primary"
                        : "text-text-muted hover:bg-surface-muted hover:text-text",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/dashboard"
                  aria-label={t("administration")}
                  title={t("administration")}
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                >
                  <ShieldIcon />
                </Link>
              )}
            </nav>
            <Link
              href="/register-property"
              onClick={() => setOpen(false)}
              className="mt-3"
              data-analytics-cta="header_sell_rent"
            >
              <Button className="w-full">
                <Plus className="h-4 w-4" />
                {t("propertyRequest")}
              </Button>
            </Link>
          </Dialog.Content>
        </Dialog.Portal>
      </header>
    </Dialog.Root>
  );
}
