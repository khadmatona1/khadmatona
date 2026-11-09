"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PropertyForm } from "@/components/properties/property-form";
import { PropertySocialPanel } from "@/components/social/property-social-panel";
import { getDashboardProperty, updateProperty } from "@/lib/properties";
import type { DashboardProperty, PropertyFormValues } from "@/types/property";

export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("DashboardProperties");
  const [property, setProperty] = useState<DashboardProperty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDashboardProperty(id)
      .then((data) => {
        if (!cancelled) setProperty(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
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
    await updateProperty(id, values);
    modal.success(t("editSuccess"));
    router.push(`/dashboard/properties/${id}`);
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !property) {
    return <Alert tone="error">{error ?? t("notFound")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("editTitle")}
        </h1>
        <p className="mt-1 truncate text-sm text-text-muted">{property.title}</p>
      </div>

      <Card className="w-full max-w-3xl">
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
            owner_contact_id: property.owner_contact_id,
            commercial_id: property.commercial_id,
          }}
          existingImages={property.images}
          propertyId={property.id}
          submitLabel={t("editSubmit")}
          onSubmit={handleSubmit}
        />
      </Card>

      <div className="w-full max-w-3xl">
        <PropertySocialPanel propertyId={property.id} />
      </div>
    </div>
  );
}
