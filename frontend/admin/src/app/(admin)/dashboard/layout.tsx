"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageTransition } from "@/components/ui/page-transition";
import { useAuth } from "@/lib/auth-context";

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <span
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-gold-primary"
        role="status"
        aria-label={label}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading, error, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Senior commercials also manage rentals from the shared rental workspace.
  const isCommercial =
    user?.roles?.some((role) => role === "Commercial" || role === "SeniorCommercial") ?? false;
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  // Espace Propriétaire (Owner Portal) is a wholly separate route group
  // ((owner)/owner/layout.tsx), not a 3rd branch of the Admin/Commercial
  // split above - an Owner never has any business under /dashboard/*.
  const isOwner = user?.roles?.includes("Owner") ?? false;
  // Exact match or a real sub-path only - a plain startsWith("/dashboard/commercial")
  // also matched "/dashboard/commercial-leads" (an unrelated Admin-only
  // page, partnership applications), incorrectly treating it as part of
  // the Commercial area and bouncing an Admin who opens it back to "/dashboard".
  const inCommercialArea =
    pathname === "/dashboard/commercial" || pathname.startsWith("/dashboard/commercial/");
  // /dashboard/profile is the one page shared by both roles (see
  // sidebar.tsx) - never redirected away from regardless of role.
  const isSharedPage = pathname === "/dashboard/profile" || pathname === "/dashboard/tasks";
  const inRentalArea = pathname === "/dashboard/rental" || pathname.startsWith("/dashboard/rental/");
  const canAccessRentalPage = isCommercial && inRentalArea;

  // Only redirect once the session check has actually completed and
  // confirmed there's no one logged in - not while it's still in flight,
  // and not when it failed to complete at all (that's the `error` case
  // below, which is a different situation from "confirmed logged out").
  useEffect(() => {
    if (!isLoading && !user && !error) {
      router.replace("/login");
    }
  }, [isLoading, user, error, router]);

  // Role-based area gating: a Commercial-only account never sees the Admin
  // dashboard (spec: "le Commercial ne doit avoir aucun accès au dashboard
  // Admin"), and an Admin-only account is bounced out of the Commercial
  // area back to their own overview - the two dashboards stay cleanly
  // separated even though they share this one layout/session.
  useEffect(() => {
    if (isLoading || !user || isSharedPage) return;

    if (isOwner) {
      router.replace("/owner");
    } else if (isCommercial && !isAdmin && !inCommercialArea && !canAccessRentalPage) {
      router.replace("/dashboard/commercial");
    } else if (!isCommercial && inCommercialArea) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, isOwner, isCommercial, isAdmin, inCommercialArea, isSharedPage, canAccessRentalPage, router]);

  if (isLoading) {
    return <FullScreenSpinner label={t("loading")} />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6">
        <div className="w-full max-w-sm text-center">
          <Alert tone="error" title={t("sessionErrorTitle")}>
            {error}
          </Alert>
          <Button onClick={() => refresh()} className="mt-5">
            {t("tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    // Confirmed logged out - the effect above is redirecting to /login.
    // Keep showing a spinner (never a bare blank page) while that
    // navigation completes.
    return <FullScreenSpinner label={t("redirecting")} />;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
