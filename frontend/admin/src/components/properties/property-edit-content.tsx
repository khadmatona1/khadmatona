"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { PropertyForm } from "@/components/properties/property-form";
import { PropertySocialPanel } from "@/components/social/property-social-panel";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import { getDashboardProperty, updateProperty } from "@/lib/properties";
import type { DashboardProperty, PropertyFormValues } from "@/types/property";

export function PropertyEditContent({
  id,
  onUpdated,
}: {
  id: number;
  /** Keeps the underlying list row in sync after a successful edit, since
   * the list doesn't refetch on its own. */
  onUpdated?: (property: DashboardProperty) => void;
}) {
  const t = useTranslations("DashboardProperties");
  const { user } = useAuth();
  const isCommercial = user?.roles?.includes("Commercial") ?? false;
  const [property, setProperty] = useState<DashboardProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDashboardProperty(id)
      .then((data) => {
        if (!cancelled) setProperty(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404
            ? t("notFound")
            : t("loadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [id]);

  async function handleSubmit(values: PropertyFormValues) {
    const updated = await updateProperty(id, values);
    onUpdated?.(updated);
    modal.success(t("editSuccess"));
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !property) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-balance text-text">
          {t("editTitle")}
        </h2>
        <p className="mt-1 truncate text-sm text-text-muted">
          {property.title}
        </p>
      </div>

      {isCommercial && property.approval_status === "approved" && (
        <Alert tone="warning">{t("editResubmitWarning")}</Alert>
      )}

      <PropertyForm
        initialValues={{
          title: property.title,
          type: property.type,
          status: property.status,
          transaction_type: property.transaction_type ?? null,
          price_period: property.price_period ?? null,
          city_id: property.city_id,
          district_id: property.district_id ?? "",
          address: property.address,
          price: property.price,
          surface: property.surface,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          description: property.description ?? "",
          // Both must be passed: the form always submits commercial_id, so
          // leaving it out here would silently unassign the property.
          owner_contact_id: property.owner_contact_id,
          commercial_id: property.commercial_id,
        }}
        existingImages={property.images}
        propertyId={property.id}
        submitLabel={t("editSubmit")}
        onSubmit={handleSubmit}
      />

      <PropertySocialPanel propertyId={property.id} />
    </div>
  );
}
