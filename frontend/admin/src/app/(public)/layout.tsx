import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/ui/page-transition";

/**
 * The public showcase site. Deliberately has no AuthProvider/session check
 * of any kind - these pages must render for anonymous visitors with zero
 * dependency on auth state. See `(admin)/layout.tsx` for where auth is
 * actually scoped.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Anonymous visitor analytics - renders nothing, never blocks. */}
      <AnalyticsProvider />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="public-site flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
    </>
  );
}
