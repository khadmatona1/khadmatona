"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { ApiError } from "@/lib/api";
import { getOwnerMonthlyReport } from "@/lib/owner-portal";
import { OwnerMonthlyReport } from "@/components/owner/owner-monthly-report";
import type { OwnerMonthlyReportEntry } from "@/types/owner";

export default function OwnerReportsPage() {
  const t = useTranslations("OwnerPortalReports");
  const [months, setMonths] = useState<OwnerMonthlyReportEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getOwnerMonthlyReport()
      .then((result) => {
        if (!cancelled) setMonths(result);
      })
      .catch((caught) => {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted">{t("loading")}</p>
      ) : (
        <OwnerMonthlyReport months={months} />
      )}
    </div>
  );
}
