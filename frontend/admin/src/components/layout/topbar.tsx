import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "./user-menu";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const nav = useTranslations("Nav");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6 lg:justify-end">
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={nav("openMenu")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text hover:bg-surface-muted"
        >
          <MenuIcon />
        </button>
        <Link href="/" className="truncate font-display text-lg font-semibold text-text">
          {nav("brand")}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <LocaleSwitcher />
        <UserMenu />
      </div>
    </header>
  );
}
