"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BellIcon } from "@/components/ui/action-icons";
import { PropertyAlertForm } from "@/components/properties/property-alert-form";
import type { PropertyFiltersValue } from "@/components/properties/property-filters";

/**
 * "Recevoir des alertes pour cette recherche" - a collapsed banner below the
 * search results that expands into PropertyAlertForm on click. Public page,
 * not the dashboard, so this is a plain inline expand rather than
 * modal.custom() (the dashboard's CRUD popup convention).
 */
export function PropertyAlertCta({ filters }: { filters: PropertyFiltersValue }) {
  const t = useTranslations("PropertyAlerts");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border bg-surface-muted p-5 sm:p-6">
      {expanded ? (
        <PropertyAlertForm filters={filters} onDone={() => setExpanded(false)} />
      ) : (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-gold-primary">
              <BellIcon />
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-text">{t("ctaTitle")}</h3>
              <p className="mt-1 text-sm text-text-muted">{t("ctaSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            data-analytics-cta="property_alert_open"
            onClick={() => setExpanded(true)}
            className="shrink-0 rounded-sm bg-gold-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-secondary"
          >
            {t("ctaButton")}
          </button>
        </div>
      )}
    </div>
  );
}
