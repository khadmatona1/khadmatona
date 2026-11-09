"use client";

import { useTranslations } from "next-intl";

/**
 * Human labels for the technical identifiers analytics stores (CTA ids,
 * form field names, wizard step names). A new identifier nobody has
 * translated yet still renders as itself instead of breaking the page.
 */
export function useAnalyticsLabels() {
  const t = useTranslations("Analytics");
  // The sell/rent wizard's property-detail fields ("surface", "bedrooms"...)
  // are already translated there - reused rather than duplicated.
  const leads = useTranslations("Leads");

  return {
    cta: (label: string | null) => (label && t.has(`ctaLabels.${label}`) ? t(`ctaLabels.${label}`) : (label ?? "—")),
    field: (name: string | null) => {
      if (!name) return "—";
      if (t.has(`fieldNames.${name}`)) return t(`fieldNames.${name}`);
      if (leads.has(`field.${name}`)) return leads(`field.${name}`);
      return name;
    },
    step: (name: string | null) => (name && t.has(`stepNames.${name}`) ? t(`stepNames.${name}`) : (name ?? "—")),
  };
}
