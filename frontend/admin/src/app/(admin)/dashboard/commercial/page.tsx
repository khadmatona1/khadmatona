"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { useAuth } from "@/lib/auth-context";
import { listLeads } from "@/lib/leads";
import { listDashboardProperties } from "@/lib/properties";

interface CommercialCounts {
  pending: number;
  approved: number;
  rejected: number;
  leads: number;
}

export default function CommercialOverviewPage() {
  const { user } = useAuth();
  const t = useTranslations("DashboardCommercialHome");
  const [counts, setCounts] = useState<CommercialCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      // No dedicated Commercial stats endpoint exists (dashboard/stats is
      // Admin-only) - each figure here is just the `total` from a
      // 1-row-per-page dashboard listing, already scoped to this
      // Commercial's own data server-side.
      const [pending, approved, rejected, leads] = await Promise.all([
        listDashboardProperties({ approvalStatus: "pending_approval", perPage: 1 }),
        listDashboardProperties({ approvalStatus: "approved", perPage: 1 }),
        listDashboardProperties({ approvalStatus: "rejected", perPage: 1 }),
        listLeads({ perPage: 1 }),
      ]);

      if (cancelled) return;
      setCounts({
        pending: pending.pagination.total,
        approved: approved.pagination.total,
        rejected: rejected.pagination.total,
        leads: leads.pagination.total,
      });
      setIsLoading(false);
    }

    run().catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const firstName = user.name.split(" ")[0];

  const statCards = counts
    ? [
        { label: t("pendingProperties"), value: String(counts.pending) },
        { label: t("approvedProperties"), value: String(counts.approved) },
        { label: t("rejectedProperties"), value: String(counts.rejected) },
        { label: t("myLeads"), value: String(counts.leads) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("welcomeSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-16" />
              </Card>
            ))
          : statCards.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} />)}
      </div>
    </div>
  );
}
