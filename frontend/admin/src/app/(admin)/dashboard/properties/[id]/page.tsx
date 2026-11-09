"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { PropertySocialPanel } from "@/components/social/property-social-panel";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { PropertyApprovalStatusBadge } from "@/components/properties/approval-status-badge";
import { ApiError } from "@/lib/api";
import { getDashboardProperty } from "@/lib/properties";
import type { DashboardProperty } from "@/types/property";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("DashboardProperties");
  const propertyDetail = useTranslations("PropertyDetail");
  const propertyType = useTranslations("PropertyType");
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

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !property) {
    return <Alert tone="error">{error ?? t("notFound")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/properties"
            className="text-sm font-semibold text-gold-primary hover:underline"
          >
            {t("backToList")}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold text-balance text-text sm:text-3xl">
            {property.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            <PropertyApprovalStatusBadge status={property.approval_status} />
            <Badge tone="neutral">{propertyType(property.type)}</Badge>
          </div>
        </div>
        <Link href={`/dashboard/properties/${property.id}/edit`} className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto">
            {t("edit")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5">
            <PropertyGallery
              images={property.images}
              title={property.title}
              noImageLabel={propertyDetail("noImage")}
              previousImageLabel={propertyDetail("previousImage")}
              nextImageLabel={propertyDetail("nextImage")}
            />
          </div>
          <p className="mb-2 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {propertyDetail("description")}
          </p>
          <p className="max-w-none text-[0.95rem] text-text">
            {property.description ?? propertyDetail("noDescription")}
          </p>
        </Card>

        <Card>
          <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("details")}
          </p>
          <dl className="flex flex-col gap-3 text-sm">
            <Row label={t("price")} value={`${currencyFormatter.format(property.price)} DH`} />
            <Row
              label={t("city")}
              value={
                property.district_name
                  ? `${property.district_name}, ${property.city_name}`
                  : (property.city_name ?? "—")
              }
            />
            <Row label={t("address")} value={property.address} />
            <Row label={t("surface")} value={`${property.surface} m²`} />
            <Row label={t("bedrooms")} value={String(property.bedrooms)} />
            <Row label={t("bathrooms")} value={String(property.bathrooms)} />
            <Row
              label={t("addedOnLabel")}
              value={dateFormatter.format(new Date(property.created_at))}
            />
          </dl>
        </Card>
      </div>

      <div className="w-full max-w-3xl">
        <PropertySocialPanel propertyId={property.id} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-end font-semibold text-text">{value}</dd>
    </div>
  );
}
