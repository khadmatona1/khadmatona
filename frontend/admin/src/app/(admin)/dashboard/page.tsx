"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { BarChart } from "@/components/dashboard/bar-chart";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getDashboardStats, listDashboardProperties } from "@/lib/properties";
import type { DashboardStats } from "@/types/dashboard";
import type { DashboardProperty } from "@/types/property";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });

function monthLabel(month: string): string {
  // `month` arrives as "YYYY-MM" from the API.
  const label = monthLabelFormatter.format(new Date(`${month}-01T00:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1).replace(/\.$/, "");
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const t = useTranslations("Dashboard");
  const propertyType = useTranslations("PropertyType");
  const propertyStatus = useTranslations("PropertyStatus");
  const [recentProperties, setRecentProperties] = useState<DashboardProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listDashboardProperties({ perPage: 5 })
      .then((result) => {
        if (!cancelled) setRecentProperties(result.properties);
      })
      .catch(() => {
        if (!cancelled) modal.error(t("loadRecentError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render, re-running on every render would refetch needlessly
  }, []);

  useEffect(() => {
    let cancelled = false;

    getDashboardStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((caught) => {
        if (cancelled) return;
        modal.error(caught instanceof ApiError ? caught.message : t("loadStatsError"));
      })
      .finally(() => {
        if (!cancelled) setIsStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render, re-running on every render would refetch needlessly
  }, []);

  if (!user) return null;

  const firstName = user.name.split(" ")[0];

  // Real figures, computed from the properties table via
  // GET /api/v1/dashboard/stats - see EloquentPropertyRepository::dashboardStats().
  const statCards = stats
    ? [
        { label: t("totalProperties"), value: String(stats.total_properties) },
        { label: t("availableProperties"), value: String(stats.available_properties) },
        { label: t("soldProperties"), value: String(stats.sold_properties) },
        { label: t("rentedProperties"), value: String(stats.rented_properties) },
        {
          label: t("monthlyRevenue"),
          value: `${currencyFormatter.format(stats.monthly_revenue)} DH`,
        },
        { label: t("newPropertiesThisMonth"), value: String(stats.new_properties_this_month) },
      ]
    : [];

  const monthlyTrend = stats
    ? stats.monthly_trend.map((point) => ({
        label: monthLabel(point.month),
        value: point.count,
      }))
    : [];

  const statusDistribution = stats
    ? [
        { label: propertyStatus("disponible"), value: stats.available_properties, color: "var(--color-success)" },
        { label: propertyStatus("vendu"), value: stats.sold_properties, color: "var(--color-info)" },
        { label: propertyStatus("loue"), value: stats.rented_properties, color: "var(--color-gold-primary)" },
        { label: propertyStatus("reserve"), value: stats.reserved_properties, color: "var(--color-warning)" },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("welcomeSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {isStatsLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-16" />
              </Card>
            ))
          : statCards.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("propertiesAddedPerMonth")}
          </p>
          {isStatsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarChart data={monthlyTrend} />
          )}
        </Card>
        <Card>
          <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("statusDistribution")}
          </p>
          {isStatsLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <DonutChart data={statusDistribution} />
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("latestProperties")}
          </p>
          <Link
            href="/dashboard/properties"
            className="text-[0.82rem] font-semibold text-gold-primary hover:underline"
          >
            {t("seeAllProperties")}
          </Link>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : recentProperties.length === 0 ? (
          <p className="text-sm text-text-muted">{t("noPropertiesYet")}</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>{t("title")}</TableHeaderCell>
              <TableHeaderCell>{t("type")}</TableHeaderCell>
              <TableHeaderCell>{t("city")}</TableHeaderCell>
              <TableHeaderCell>{t("status")}</TableHeaderCell>
              <TableHeaderCell>{t("price")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {recentProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell label={t("title")} className="max-w-[240px] truncate font-semibold">
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="hover:text-gold-primary hover:underline"
                    >
                      {property.title}
                    </Link>
                  </TableCell>
                  <TableCell label={t("type")}>{propertyType(property.type)}</TableCell>
                  <TableCell label={t("city")}>{property.city_name}</TableCell>
                  <TableCell label={t("status")}>
                    <PropertyStatusBadge status={property.status} />
                  </TableCell>
                  <TableCell label={t("price")} className="font-mono tabular-nums">
                    <bdi dir="ltr">{currencyFormatter.format(property.price)} DH</bdi>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
