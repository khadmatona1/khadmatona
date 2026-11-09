"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useTranslations("Auth");
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full py-1 ps-1 pe-3 text-sm font-semibold text-text hover:bg-surface-muted"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold font-mono text-xs font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
      </button>

      <div
        role="menu"
        className={clsx(
          "absolute end-0 z-10 mt-2 w-56 origin-top-right rounded-md border border-border bg-surface py-1.5 shadow-lg",
          "transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
      >
        <div className="border-b border-border px-3.5 py-2.5">
          <p className="truncate text-sm font-semibold text-text">
            {user.name}
          </p>
          <p className="truncate text-xs text-text-muted">{user.email}</p>
        </div>
        <Link
          href="/dashboard/profile"
          role="menuitem"
          onClick={() => setOpen(false)}
          className="block w-full px-3.5 py-2.5 text-start text-sm font-semibold text-text transition-colors hover:bg-surface-muted"
        >
          {t("profile")}
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full px-3.5 py-2.5 text-start text-sm font-semibold text-error transition-colors hover:bg-error-surface disabled:opacity-50"
        >
          {isLoggingOut ? t("signingOut") : t("signOut")}
        </button>
      </div>
    </div>
  );
}
