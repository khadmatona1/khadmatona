"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { getRentalDashboard } from "@/lib/rental";
import { RentalShell, propertyLabel, useRentalFormat } from "@/components/rental/rental-ui";
import type { DashboardStay, RentalDashboard } from "@/types/rental";

/** Day-to-day view: who arrives and leaves this week, what needs doing, this month's figures. */
export function RentalOverviewPage() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const [data, setData] = useState<RentalDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRentalDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught) => {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, []);

  return (
    <RentalShell title={t("overview.title")} subtitle={t("overview.subtitle")}>
      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("overview.arrivalsToday")} value={String(data.counts.arrivals_today)} />
            <StatCard label={t("overview.departuresToday")} value={String(data.counts.departures_today)} />
            <StatCard label={t("overview.inHouse")} value={String(data.counts.in_house)} />
            <StatCard label={t("overview.occupancy")} value={`${data.occupancy_rate} %`} hint={t("overview.managedCount", { count: data.counts.managed_properties })} />
            <StatCard label={t("overview.pendingCleanings")} value={String(data.counts.pending_cleanings)} />
            <StatCard
              label={t("overview.openMaintenance")}
              value={String(data.counts.open_maintenance)}
              hint={data.counts.urgent_maintenance > 0 ? t("overview.urgentCount", { count: data.counts.urgent_maintenance }) : undefined}
            />
            <StatCard label={t("overview.monthRevenue")} value={format.money(data.month.net_revenue)} hint={format.month(data.month.month)} />
            <StatCard
              label={t("overview.monthSplit")}
              value={format.money(data.month.owner_share)}
              hint={t("overview.monthSplitHint", { amount: format.money(data.month.khadmatona_share) })}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <StayList title={t("overview.nextArrivals")} stays={data.arrivals} date="check_in_date" empty={t("overview.noArrivals")} today={data.today} />
            <StayList title={t("overview.nextDepartures")} stays={data.departures} date="check_out_date" empty={t("overview.noDepartures")} today={data.today} />
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("overview.cleaningsToDo")}</p>
                <Link href="/dashboard/rental/cleaning" className="text-[0.8rem] font-semibold text-gold-primary hover:underline">{t("overview.seeAll")}</Link>
              </div>
              {data.cleanings.length === 0 ? (
                <p className="text-sm text-text-muted">{t("overview.noCleanings")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.cleanings.map((cleaning) => (
                    <li key={cleaning.id} className="rounded-md border border-border px-3 py-2 text-sm">
                      <p className="truncate font-semibold text-text">{propertyLabel(cleaning)}</p>
                      <p className={cleaning.overdue ? "text-[0.78rem] font-semibold text-error" : "text-[0.78rem] text-text-muted"}>
                        {format.day(cleaning.scheduled_for)}
                        {cleaning.overdue ? ` · ${t("cleaning.overdue")}` : ""}
                        {cleaning.cleaner_name ? ` · ${cleaning.cleaner_name}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </RentalShell>
  );
}

function StayList({ title, stays, date, empty, today }: { title: string; stays: DashboardStay[]; date: "check_in_date" | "check_out_date"; empty: string; today: string }) {
  const t = useTranslations("Rental");
  const format = useRentalFormat();

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{title}</p>
        <Link href="/dashboard/rental/reservations" className="text-[0.8rem] font-semibold text-gold-primary hover:underline">{t("overview.seeAll")}</Link>
      </div>
      {stays.length === 0 ? (
        <p className="text-sm text-text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stays.map((stay) => (
            <li key={stay.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-text">{stay.guest_name}</p>
                <span className={stay[date] === today ? "shrink-0 text-[0.75rem] font-bold text-gold-primary" : "shrink-0 text-[0.75rem] text-text-muted"}>
                  {stay[date] === today ? t("overview.today") : format.day(stay[date])}
                </span>
              </div>
              <p className="truncate text-[0.78rem] text-text-muted">
                {propertyLabel(stay)} · {t("fields.guestsShort", { count: stay.guests_count })} · {t(`channel.${stay.channel}`)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
