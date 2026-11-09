import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { PropertyApprovalStatusBadge } from "@/components/properties/approval-status-badge";
import type { OwnerProperty } from "@/types/owner";

const currencyFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function OwnerPropertyCard({ property }: { property: OwnerProperty }) {
  const t = useTranslations("OwnerPortal");
  const propertyType = useTranslations("PropertyType");

  return (
    <Card radius="md" className="flex flex-col gap-4 sm:flex-row">
      <div
        className="h-40 w-full shrink-0 rounded-sm bg-surface-muted bg-cover bg-center sm:h-auto sm:w-48"
        style={property.cover_image ? { backgroundImage: `url(${property.cover_image})` } : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-text">{property.title}</h3>
            <p className="mt-0.5 text-sm text-text-muted">
              {propertyType(property.type)} · {property.city_name ?? "—"}
              {property.district_name ? `, ${property.district_name}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <PropertyStatusBadge status={property.status} />
            <PropertyApprovalStatusBadge status={property.approval_status} />
          </div>
        </div>

        {property.approval_status === "rejected" && property.rejection_reason && (
          <p className="rounded-sm border border-error/30 bg-error-surface px-3 py-2 text-sm text-error">
            {property.rejection_reason}
          </p>
        )}

        <p className="font-mono text-lg font-semibold tabular-nums text-text" dir="ltr">
          {currencyFormatter.format(property.price)} <span className="text-sm font-semibold text-text-muted">DH</span>
        </p>

        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("leadsCount")}</p>
            <p className="mt-0.5 text-xl font-semibold text-text">{property.leads_count}</p>
          </div>
          <div>
            <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("completedVisitsCount")}</p>
            <p className="mt-0.5 text-xl font-semibold text-text">{property.completed_visits_count}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
