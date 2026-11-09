"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import type { FinanceFilters } from "@/types/finance";
const metrics = ["leads", "visits", "visits_completed", "tasks", "tasks_completed"] as const;
type Counts = Record<typeof metrics[number], number>;
interface Report { totals: Counts; commercials: (Counts & {id: number | null; name: string | null})[] }
export function ActivityReport({ filters, version }: {filters: FinanceFilters; version: number}) {
  const t = useTranslations("BusinessReports");
  const finance = useTranslations("Finance");
  const locale = useLocale();
  const key = JSON.stringify({from: filters.from, to: filters.to, commercial_id: filters.commercial_id, version, locale});
  const [state, setState] = useState<{key: string; data?: Report; error?: string}>({key:""});
  useEffect(() => {
    let cancelled = false;
    const {from,to,commercial_id} = JSON.parse(key);
    const query = new URLSearchParams({from,to});
    if(commercial_id) query.set("commercial_id",commercial_id);
    api.get<Report>("/api/v1/finance/activity?" + query).then(data => {if(!cancelled) setState({key,data});})
      .catch(error => {if(!cancelled) setState({key,error: error instanceof ApiError ? error.message : finance("loadError")});});
    return () => {cancelled=true;};
  }, [key, finance]);
  const data = state.key === key ? state.data : undefined;
  return <Card><h2 className="mb-2 font-display text-xl font-semibold text-text">{t("activity")}</h2><p className="mb-5 text-sm text-text-muted">{t("activityHint")}</p>
    {state.key !== key ? <p role="status">{finance("loading")}</p> : state.error ? <p role="alert" className="text-error">{state.error}</p> : data && <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(metric => <StatCard key={metric} label={t(metric)} value={new Intl.NumberFormat(locale).format(data.totals[metric])} />)}</div>
      {!data.commercials.length ? <p className="text-text-muted">{finance("empty")}</p> : <Table><TableHead><TableHeaderCell>{finance("commercial")}</TableHeaderCell>{metrics.map(metric => <TableHeaderCell key={metric}>{t(metric)}</TableHeaderCell>)}</TableHead><TableBody>{data.commercials.map(row => <TableRow key={row.id ?? "unassigned"}><TableCell label={finance("commercial")}>{row.name ?? finance("unassigned")}</TableCell>{metrics.map(metric => <TableCell key={metric} label={t(metric)}>{new Intl.NumberFormat(locale).format(row[metric])}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </>}
  </Card>;
}
