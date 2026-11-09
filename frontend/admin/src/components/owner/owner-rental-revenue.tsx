"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { getOwnerRentalStatement, listOwnerStays } from "@/lib/rental";
import { MonthPicker, ReservationStatusBadge, businessToday, propertyLabel, useRentalFormat } from "@/components/rental/rental-ui";
import { StatementView } from "@/components/rental/statement-view";
import type { OwnerStay, Statement } from "@/types/rental";

/**
 * Espace Propriétaire - rental revenue of the owner's own properties, one
 * month at a time: the statement (without KHADMATONA's internal figures) and
 * the stays behind it (dates and amounts only, never guest identities).
 */
export function OwnerRentalRevenue() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const [month, setMonth] = useState(businessToday().slice(0, 7));
  const [statement, setStatement] = useState<Statement | null>(null);
  const [stays, setStays] = useState<OwnerStay[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getOwnerRentalStatement(month), listOwnerStays(month)])
      .then(([nextStatement, nextStays]) => {
        if (cancelled) return;
        setStatement(nextStatement);
        setStays(nextStays);
      })
      .catch((caught) => {
        if (!cancelled) modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [month]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("owner.title")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("owner.subtitle")}</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {statement ? <StatementView statement={statement} audience="owner" /> : <Skeleton className="h-56 w-full" />}

      <Card>
        <p className="mb-4 text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{t("owner.stays")}</p>
        {!stays ? (
          <Skeleton className="h-24 w-full" />
        ) : stays.length === 0 ? (
          <p className="text-sm text-text-muted">{t("owner.noStays")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stays.map((stay) => (
              <li key={stay.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">{propertyLabel(stay)}</p>
                  <p className="text-[0.78rem] text-text-muted">
                    <bdi>{format.day(stay.check_in_date)}</bdi> – <bdi>{format.day(stay.check_out_date)}</bdi> · {t("fields.nightsCount", { count: stay.nights })} · {t(`channel.${stay.channel}`)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ReservationStatusBadge status={stay.status} />
                  <span className="font-mono font-semibold text-text tabular-nums">{format.money(stay.net_revenue)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Compact current-month card for the owner overview, linking to the full page. */
export function OwnerRentalSummary() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOwnerRentalStatement(businessToday().slice(0, 7))
      .then((result) => {
        if (!cancelled) setStatement(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  return (
    <Card radius="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-text">{t("owner.summaryTitle")}</p>
          {!statement ? (
            <Skeleton className="mt-2 h-6 w-32" />
          ) : statement.properties.length === 0 ? (
            <p className="mt-1 text-sm text-text-muted">{t("owner.notManaged")}</p>
          ) : (
            <p className="mt-1 text-sm text-text-muted">
              {t("owner.summaryLine", { month: format.month(statement.month), amount: format.money(statement.totals.owner_share) })}
            </p>
          )}
        </div>
        <Link href="/owner/revenue" className="text-sm font-semibold text-gold-primary hover:underline">
          {t("owner.seeDetails")}
        </Link>
      </div>
    </Card>
  );
}
