"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { listProperties } from "@/lib/properties";
import { Pagination } from "@/components/ui/pagination";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyCardSkeleton } from "@/components/properties/property-card-skeleton";
import {
  EMPTY_PROPERTY_FILTERS,
  PropertyFilters,
  type PropertyFiltersValue,
} from "@/components/properties/property-filters";
import { PropertyAlertCta } from "@/components/properties/property-alert-cta";
import type { Pagination as PaginationData, Property } from "@/types/property";

const queryKeys: Record<keyof PropertyFiltersValue, string> = {
  search: "search",
  type: "type",
  status: "status",
  cityId: "city_id",
  transactionType: "transaction_type",
  pricePeriod: "price_period",
  priceMin: "price_min",
  priceMax: "price_max",
  surfaceMin: "surface_min",
  surfaceMax: "surface_max",
};
export function PropertiesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Properties");
  const ux = useTranslations("PublicUx");
  const key = searchParams.toString();
  const filters = { ...EMPTY_PROPERTY_FILTERS };
  for (const name of Object.keys(queryKeys) as (keyof PropertyFiltersValue)[])
    Object.assign(filters, { [name]: searchParams.get(queryKeys[name]) ?? "" });
  filters.status = "";
  const rawSort = searchParams.get("sort") ?? "-created_at";
  const sort = ["-created_at", "price", "-price"].includes(rawSort)
    ? rawSort
    : "-created_at";
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    key: string;
    version: number;
    properties: Property[];
    pagination: PaginationData | null;
    error: number | null;
  }>({ key: "", version: -1, properties: [], pagination: null, error: null });
  const loading = state.key !== key || state.version !== version;
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(key);
    const number = (name: string) =>
      params.get(name) ? Number(params.get(name)) : undefined;
    listProperties({
      page: Math.max(1, Number(params.get("page")) || 1),
      perPage: 12,
      sort: ["-created_at", "price", "-price"].includes(
        params.get("sort") ?? "",
      )
        ? params.get("sort")!
        : "-created_at",
      search: params.get("search") || undefined,
      type: (params.get("type") || undefined) as Property["type"] | undefined,
      transactionType: (params.get("transaction_type") || undefined) as
        "sale" | "rent" | undefined,
      pricePeriod: (params.get("price_period") || undefined) as
        "month" | "night" | undefined,
      cityId: number("city_id"),
      priceMin: number("price_min"),
      priceMax: number("price_max"),
      surfaceMin: number("surface_min"),
      surfaceMax: number("surface_max"),
    })
      .then((result) => {
        if (!cancelled) setState({ key, version, ...result, error: null });
      })
      .catch((error) => {
        if (!cancelled)
          setState({
            key,
            version,
            properties: [],
            pagination: null,
            error: error instanceof ApiError ? error.status : 0,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [key, version]);
  function apply(next: PropertyFiltersValue) {
    const query = new URLSearchParams();
    for (const name of Object.keys(queryKeys) as (keyof PropertyFiltersValue)[])
      if (next[name]) query.set(queryKeys[name], next[name]);
    if (sort !== "-created_at") query.set("sort", sort);
    router.push(`/properties${query.size ? `?${query}` : ""}`, {
      scroll: false,
    });
  }
  function update(name: string, value: string) {
    const query = new URLSearchParams(key);
    query.set(name, value);
    if (name !== "page") query.delete("page");
    router.push(`/properties?${query}`, { scroll: false });
    if (name === "page")
      document
        .getElementById("property-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className="flex flex-col gap-5">
      <PropertyFilters key={key} initialValue={filters} onApply={apply} />
      <div
        id="property-results"
        className="flex scroll-mt-28 flex-wrap items-center justify-between gap-3"
      >
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-semibold text-text"
        >
          {loading
            ? t("loading")
            : state.error !== null
              ? ""
              : ux("results", { count: state.pagination?.total ?? 0 })}
        </p>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          {ux("sort")}
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="min-h-11 rounded-xl border border-border-strong bg-surface px-3 text-text"
          >
            <option value="-created_at">{ux("newest")}</option>
            <option value="price">{ux("priceAsc")}</option>
            <option value="-price">{ux("priceDesc")}</option>
          </select>
        </label>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : state.error !== null ? (
        <div
          role="alert"
          className="rounded-2xl border border-border bg-surface-muted p-6"
        >
          <h2 className="font-semibold text-text">{ux("loadErrorTitle")}</h2>
          <p className="mt-2 text-text-muted">
            {ux(state.error === 429 ? "rateLimitHint" : "loadErrorHint")}
          </p>
          <button
            onClick={() => setVersion((v) => v + 1)}
            className="mt-4 min-h-12 rounded-xl bg-gradient-gold px-5 text-ink"
          >
            {ux("retry")}
          </button>
        </div>
      ) : state.properties.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-text">
            {t("noResultsTitle")}
          </h2>
          <p className="max-w-sm text-text-muted">{t("noResultsSubtitle")}</p>
          <button
            onClick={() => apply(EMPTY_PROPERTY_FILTERS)}
            className="min-h-12 rounded-xl bg-gradient-gold px-5 font-semibold text-ink"
          >
            {t("resetFilters")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {state.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          {state.pagination && (
            <Pagination
              pagination={state.pagination}
              onPageChange={(p) => update("page", String(p))}
            />
          )}
        </>
      )}
      <PropertyAlertCta filters={filters} />
    </div>
  );
}
