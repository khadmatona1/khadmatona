"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { PropertyForm } from "@/components/properties/property-form";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import { createProperty } from "@/lib/properties";
import type { DashboardProperty, PropertyFormValues } from "@/types/property";

/**
 * Commercial's own "Add property" popup - same PropertyForm as the Admin
 * create popup (property-create-content.tsx), but with Commercial-facing
 * copy. A plain Commercial gets a notice that the listing needs approval
 * before it goes public; a SeniorCommercial skips that queue entirely
 * (see PropertyController::applyOwnership()) so they get a "goes live
 * immediately" notice instead. approval_status/commercial_id are always
 * server-set either way, never part of the form itself.
 */
export function CommercialPropertyCreateContent({
  onCreated,
}: {
  onCreated?: (property: DashboardProperty) => void;
}) {
  const t = useTranslations("DashboardCommercialProperties");
  const { user } = useAuth();
  const isSenior = user?.roles?.includes("SeniorCommercial") ?? false;

  async function handleSubmit(values: PropertyFormValues) {
    const property = await createProperty(values);
    onCreated?.(property);
    modal.success(isSenior ? t("createSuccessPublished") : t("createSuccess"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("newTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <Alert tone="info">{isSenior ? t("newPublishedNotice") : t("newPendingNotice")}</Alert>

      <PropertyForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
    </div>
  );
}
