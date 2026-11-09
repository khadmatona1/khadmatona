"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState, useRentalFormat } from "@/components/rental/rental-ui";
import type { Statement } from "@/types/rental";

/**
 * The monthly owner / KHADMATONA split. `audience="owner"` (Owner Portal)
 * hides KHADMATONA's own share and costs - internal figures an owner has no
 * reason to see - but keeps the commission they are charged.
 */
export function StatementView({ statement, audience = "admin" }: { statement: Statement; audience?: "admin" | "owner" }) {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const [open, setOpen] = useState<number | null>(null);
  const isAdmin = audience === "admin";
  const totals = statement.totals;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("statement.netRevenue")} value={format.money(totals.net_revenue)} hint={t("statement.staysHint", { count: totals.reservations, nights: totals.nights })} />
        <StatCard label={t("statement.commission")} value={format.money(totals.commission)} />
        <StatCard label={t("statement.ownerShare")} value={format.money(totals.owner_share)} hint={t("statement.afterCosts", { amount: format.money(totals.expenses_owner) })} />
        {isAdmin ? (
          <StatCard label={t("statement.khadmatonaShare")} value={format.money(totals.khadmatona_share)} hint={t("statement.afterCosts", { amount: format.money(totals.expenses_khadmatona) })} />
        ) : (
          <StatCard label={t("statement.platformFees")} value={format.money(totals.platform_fees)} />
        )}
      </div>

      {statement.properties.length === 0 ? (
        <EmptyState title={t("statement.empty")} />
      ) : (
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
                <th className="px-4 py-3 text-start">{t("fields.property")}</th>
                <th className="px-4 py-3 text-end">{t("statement.stays")}</th>
                <th className="px-4 py-3 text-end">{t("statement.netRevenue")}</th>
                <th className="px-4 py-3 text-end">{t("statement.commission")}</th>
                <th className="px-4 py-3 text-end">{t("statement.ownerCosts")}</th>
                <th className="px-4 py-3 text-end">{t("statement.ownerShare")}</th>
                {isAdmin && <th className="px-4 py-3 text-end">{t("statement.khadmatonaShare")}</th>}
                <th className="w-10 px-2 py-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {statement.properties.map((row) => {
                const lines = (row.lines ?? []).filter((line) => isAdmin || line.charged_to === "owner");
                const expanded = open === row.property_id;
                return (
                  <Fragment key={row.property_id}>
                    <tr className="border-t border-border">
                      <td className="max-w-[240px] truncate px-4 py-3 font-semibold text-text">
                        #{row.property_id} {row.property_title}
                        <span className="block text-[0.72rem] font-normal text-text-muted">{t("statement.rate", { rate: row.commission_rate })}</span>
                      </td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">{t("statement.staysCell", { count: row.reservations, nights: row.nights })}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">
                        {format.money(row.net_revenue)}
                        {row.platform_fees > 0 && <span className="block text-[0.72rem] text-text-muted">{t("statement.feesCell", { amount: format.money(row.platform_fees) })}</span>}
                      </td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">{format.money(row.commission)}</td>
                      <td className="px-4 py-3 text-end font-mono tabular-nums">{format.money(row.expenses_owner)}</td>
                      <td className="px-4 py-3 text-end font-mono font-semibold text-gold-primary tabular-nums">{format.money(row.owner_share)}</td>
                      {isAdmin && <td className="px-4 py-3 text-end font-mono font-semibold tabular-nums">{format.money(row.khadmatona_share)}</td>}
                      <td className="px-2 py-3">
                        {lines.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setOpen(expanded ? null : row.property_id)}
                            aria-expanded={expanded}
                            aria-label={t("statement.showCosts")}
                            className="rounded-sm p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                          >
                            <ChevronDown className={clsx("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-surface-muted/60">
                        <td colSpan={isAdmin ? 8 : 7} className="px-4 py-3">
                          <ul className="flex flex-col gap-1.5 text-[0.82rem]">
                            {lines.map((line, index) => (
                              <li key={index} className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-text">
                                  {format.day(line.date)} · {t(`costSource.${line.source}`)}
                                  {line.source === "expense" ? ` · ${t(`expenseCategory.${line.category}`)}` : ""}
                                  {line.label ? ` · ${line.label}` : ""}
                                </span>
                                <span className="font-mono tabular-nums text-text">
                                  {format.money(line.amount)}
                                  {isAdmin && <span className="ms-2 text-[0.72rem] text-text-muted">{t(`chargedTo.${line.charged_to}`)}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-[0.76rem] text-text-muted">{isAdmin ? t("statement.rulesAdmin") : t("statement.rulesOwner")}</p>
    </div>
  );
}
