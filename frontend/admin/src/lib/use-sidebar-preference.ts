"use client";

import { useSyncExternalStore } from "react";

const eventName = "khadmatona-sidebar-change";
const fallback = new Map<string, boolean>();
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(eventName, notify);
  };
}

export function useSidebarPreference(key: string, initial: boolean) {
  const read = () => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === "true" || saved === "false") return saved === "true";
    } catch { /* Private browsing may disable storage. */ }
    return fallback.get(key) ?? initial;
  };
  const value = useSyncExternalStore(subscribe, read, () => initial);
  const set = (next: boolean) => {
    fallback.set(key, next);
    try { localStorage.setItem(key, String(next)); } catch { /* Retain this session's state. */ }
    window.dispatchEvent(new Event(eventName));
  };
  return [value, set] as const;
}
