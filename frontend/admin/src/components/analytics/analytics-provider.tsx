"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { initAnalytics, setAnalyticsConsent, trackPageView } from "@/lib/analytics/tracker";

/**
 * Mounted once in the public layout. Records a page view on every
 * client-side navigation and wires the tracker's global listeners (clicks
 * on phone/email/WhatsApp/social links and [data-analytics-cta] elements,
 * visibility, heartbeat).
 *
 * Staff browsing the public site (any account holding a role: Admin,
 * Commercial, Owner...) is never tracked, so their own checks don't
 * inflate the numbers. Events wait in memory until that check finishes,
 * then are sent or dropped.
 *
 * There is no cookie/consent banner on the site today. When one is added,
 * call setAnalyticsConsent("granted" | "denied") from it instead of
 * granting here. Do Not Track and Global Privacy Control are always honored.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;
    const isStaff = (user?.roles?.length ?? 0) > 0;
    setAnalyticsConsent(isStaff ? "denied" : "granted");
  }, [isLoading, user]);

  return null;
}
