"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { ApiError } from "@/lib/api";
import { listOwnerProperties } from "@/lib/owner-portal";
import { Pagination } from "@/components/ui/pagination";
import { OwnerPropertyCard } from "@/components/owner/owner-property-card";
import { OwnerRentalSummary } from "@/components/owner/owner-rental-revenue";
import type { OwnerProperty } from "@/types/owner";
import type { Pagination as PaginationData } from "@/types/property";

export default function OwnerOverviewPage() {
  const t = useTranslations("OwnerPortal");
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      try {
        const result = await listOwnerProperties(page);
        if (cancelled) return;
        setProperties(result.properties);
        setPagination(result.pagination);
      } catch (caught) {
        if (cancelled) return;
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [page]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("overviewTitle")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("overviewSubtitle")}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted">{t("loading")}</p>
      ) : properties.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noPropertiesTitle")}</h3>
          <p className="mt-2 text-sm text-text-muted">{t("noPropertiesBody")}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {properties.map((property) => (
              <OwnerPropertyCard key={property.id} property={property} />
            ))}
          </div>
          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}

      <OwnerRentalSummary />
    </div>
  );
}
