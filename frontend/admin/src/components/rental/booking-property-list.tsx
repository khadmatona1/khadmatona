"use client";

import { PropertyImage } from "@/components/properties/property-image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { listBookingProperties } from "@/lib/booking";
import type { Property, Pagination as PageInfo } from "@/types/property";

export function BookingPropertyList() {
  const t = useTranslations("Booking");
  const detail = useTranslations("PropertyDetail");
  const propertyType = useTranslations("PropertyType");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify({ search, page, version });
  const [state, setState] = useState<{
    key: string;
    properties: Property[];
    pagination: PageInfo | null;
    error: boolean;
  }>({ key: "", properties: [], pagination: null, error: false });
  const loading = state.key !== key;
  useEffect(() => {
    let cancelled = false;
    const params = JSON.parse(key) as { page: number; search: string };
    listBookingProperties(params.page, params.search)
      .then((result) => {
        if (!cancelled) setState({ key, ...result, error: false });
      })
      .catch(() => {
        if (!cancelled)
          setState({ key, properties: [], pagination: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-gold-primary">
          {t("chooseStep")}
        </p>
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("chooseTitle")}
        </h1>
        <p className="mt-4 text-text-muted">{t("chooseHint")}</p>
      </header>
      <form
        className="flex max-w-xl items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(
            String(
              new FormData(event.currentTarget).get("search") ?? "",
            ).trim(),
          );
          setPage(1);
        }}
      >
        <div className="flex-1">
          <Field
            name="search"
            type="search"
            label={t("searchProperty")}
            maxLength={100}
          />
        </div>
        <Button type="submit">{t("search")}</Button>
      </form>
      {loading ? (
        <div
          role="status"
          aria-label={t("loadingProperties")}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-border bg-surface p-6"
        >
          <p className="mb-4 text-text-muted">{t("catalogError")}</p>
          <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>
            {t("retry")}
          </Button>
        </div>
      ) : !state.properties.length ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="text-text-muted">{t("noProperties")}</p>
          <Link
            href="/contact"
            className="mt-4 inline-block font-semibold text-gold-primary underline"
          >
            {t("contactTeam")}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {state.properties.map((property) => (
              <Link
                href={`/properties/${property.id}?stay=1`}
                key={property.id}
                className="group flex flex-col overflow-hidden rounded-2xl bg-surface transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-gold-primary"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted">
                  <PropertyImage
                    src={property.cover_image}
                    alt={property.title}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 px-1 py-4">
                  <p className="text-xs font-semibold uppercase text-gold-primary">
                    {propertyType(property.type)}
                  </p>
                  <h2 className="font-display text-xl font-semibold text-text">
                    {property.title}
                  </h2>
                  <p className="flex items-center gap-2 text-sm text-text-muted">
                    <MapPin size={15} />
                    {[property.district_name, property.city_name]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-sm text-text-muted">
                    {property.bedrooms} {detail("bedrooms").toLocaleLowerCase()}{" "}
                    · {property.bathrooms}{" "}
                    {detail("bathrooms").toLocaleLowerCase()}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t("priceOnRequest")}
                  </p>
                  <span className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm font-bold text-gold-primary">
                    {t("chooseProperty")}
                    <ArrowRight size={17} className="rtl:rotate-180" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {state.pagination && (
            <Pagination pagination={state.pagination} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
