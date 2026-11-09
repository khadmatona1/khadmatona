import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Bath, BedDouble, MapPin } from "lucide-react";
import { PropertyInquiry } from "@/components/properties/property-inquiry";
import { PropertyPrice } from "@/components/properties/property-price";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { getProperty } from "@/lib/properties";

export const revalidate = 60;

async function loadProperty(id: string) {
  try {
    return await getProperty(id);
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      notFound();
    }
    throw caught;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = await loadProperty(id);
  const propertyType = await getTranslations("PropertyType");
  const detail = await getTranslations("PropertyDetail");

  return {
    title: property.title,
    description: `${propertyType(property.type)} · ${property.city_name} · ${property.bedrooms} ${detail("bedrooms")} · ${property.bathrooms} ${detail("bathrooms")}`,
  };
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stay?: string }>;
}) {
  const { id } = await params;
  const property = await loadProperty(id);
  const stay = (await searchParams).stay === "1";

  return <PropertyDetailContent property={property} stay={stay} />;
}

function PropertyDetailContent({
  property,
  stay,
}: {
  property: Awaited<ReturnType<typeof loadProperty>>;
  stay: boolean;
}) {
  const t = useTranslations("PropertyDetail");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const propertyType = useTranslations("PropertyType");
  const booking = useTranslations("Booking");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href={stay ? "/reserver" : "/properties"}
        className="text-sm font-semibold text-gold-primary hover:underline"
      >
        {stay ? booking("chooseTitle") : t("backToList")}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-balance font-display text-3xl font-semibold text-text sm:text-4xl">
            {property.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            <Badge tone="neutral">{propertyType(property.type)}</Badge>
          </div>
        </div>
        {stay ? (
          <p className="max-w-xs text-sm text-text-muted">
            {booking("priceOnRequest")}
          </p>
        ) : (
          <p
            className="font-mono text-2xl font-semibold tabular-nums text-text"
            dir="ltr"
          >
            <PropertyPrice property={property} />
          </p>
        )}
      </div>

      {stay && (
        <div className="mt-8">
          <PropertyGallery
            images={property.images}
            title={property.title}
            noImageLabel={t("noImage")}
            previousImageLabel={t("previousImage")}
            nextImageLabel={t("nextImage")}
            landscape
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
        <div className="flex flex-col gap-6 min-w-0">
          {!stay && (
            <PropertyGallery
              images={property.images}
              title={property.title}
              noImageLabel={t("noImage")}
              previousImageLabel={t("previousImage")}
              nextImageLabel={t("nextImage")}
            />
          )}

          {stay ? (
            <div className="divide-y divide-border border-y border-border">
              <dl className="flex flex-wrap gap-x-6 gap-y-4 py-6 text-sm text-text">
                <StaySpec
                  icon={<BedDouble size={20} />}
                  label={t("bedrooms")}
                  value={String(property.bedrooms)}
                />
                <StaySpec
                  icon={<Bath size={20} />}
                  label={t("bathrooms")}
                  value={String(property.bathrooms)}
                />
                <StaySpec
                  icon={<MapPin size={20} />}
                  label={t("city")}
                  value={
                    property.district_name
                      ? `${property.district_name}, ${property.city_name}`
                      : (property.city_name ?? "—")
                  }
                />
              </dl>
              <section className="py-7">
                <h2 className="font-display text-2xl font-semibold text-text">
                  {t("description")}
                </h2>
                <p className="mt-4 whitespace-pre-line text-base leading-7 text-text">
                  {property.description ?? t("noDescription")}
                </p>
                <p className="mt-5 flex items-center gap-2 text-sm text-text-muted">
                  <MapPin size={16} aria-hidden="true" />
                  {property.address}
                </p>
              </section>
            </div>
          ) : (
            <>
              <Card radius="md">
                <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
                  {t("features")}
                </p>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <Spec
                    label={t("bedrooms")}
                    value={String(property.bedrooms)}
                  />
                  <Spec
                    label={t("bathrooms")}
                    value={String(property.bathrooms)}
                  />
                  <Spec label={t("surface")} value={`${property.surface} m²`} />
                  <Spec
                    label={t("city")}
                    value={
                      property.district_name
                        ? `${property.district_name}, ${property.city_name}`
                        : (property.city_name ?? "—")
                    }
                  />
                </dl>
              </Card>

              <Card radius="md">
                <p className="mb-2 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
                  {t("description")}
                </p>
                <p className="whitespace-pre-line text-base leading-relaxed text-text">
                  {property.description ?? t("noDescription")}
                </p>
                <p className="mt-4 text-[0.8rem] text-text-muted">
                  {t("addressPublished", {
                    address: property.address,
                    date: dateFormatter.format(new Date(property.created_at)),
                  })}
                </p>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <PropertyInquiry
            propertyId={property.id}
            title={property.title}
            stay={stay}
            available={property.status === "disponible"}
          />
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.72rem] text-text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 font-semibold text-text">{value}</dd>
    </div>
  );
}

function StaySpec({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-36 items-center gap-3">
      <span className="text-text" aria-hidden="true">
        {icon}
      </span>
      <div>
        <dt className="font-semibold text-text">{value}</dt>
        <dd className="text-xs text-text-muted">{label}</dd>
      </div>
    </div>
  );
}
