"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { OwnerSidebar } from "@/components/owner/owner-sidebar";
import { Topbar } from "@/components/layout/topbar";
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

/**
 * Espace Propriétaire - a wholly separate route group from (admin)/dashboard,
 * mirroring the existing (admin)/(public) separation rather than trying to
 * fold a 3rd role into dashboard/layout.tsx's Admin/Commercial-shaped
 * branching. Reuses useAuth() as-is (it's guard-agnostic - just "whoever
 * /api/v1/auth/me says is logged in").
 */
export default function OwnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, isLoading, error, refresh } = useAuth();
  const router = useRouter();
  const t = useTranslations("OwnerPortal");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isOwner = user?.roles?.includes("Owner") ?? false;

  useEffect(() => {
    if (!isLoading && !user && !error) {
      router.replace("/login");
    }
  }, [isLoading, user, error, router]);

  // The mirror of dashboard/layout.tsx's own Owner redirect - a non-Owner
  // account (Admin/Commercial, or a role-less user) never has any business
  // under /owner.
  useEffect(() => {
    if (isLoading || !user) return;
    if (!isOwner) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, isOwner, router]);

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

  if (!user || !isOwner) {
    // Confirmed logged out, or not an Owner - the effect above is
    // redirecting. Keep showing a spinner, never a bare blank/wrong page.
    return <FullScreenSpinner label={t("redirecting")} />;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <OwnerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
