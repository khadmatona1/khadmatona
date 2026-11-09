"use client";

import Link from "next/link";
import { ActivityReport } from "./activity-report";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { deleteFinancialEntry, getFinanceOptions, getFinanceReport } from "@/lib/finance";
import { modal } from "@/lib/modal";
import { useAuth } from "@/lib/auth-context";
import { FinanceEntryForm, financeToday } from "./finance-entry-form";
import type { FinanceFilters, FinanceOptions, FinancePerformance, FinanceReport, FinancialEntry } from "@/types/finance";

function PerformanceTable({ rows, group, commissionsOnly = false }: { rows: FinancePerformance[]; group: "commercial" | "property"; commissionsOnly?: boolean }) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const money = (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "MAD" }).format(cents / 100);
  const reports = useTranslations("BusinessReports");
  const columns = commissionsOnly ? ["commissions"] as const : ["revenue", "receipts", "commissions", "expenses", "margin"] as const;
  return <Card>
    <h2 className="mb-2 font-display text-xl font-semibold text-text">{t(group === "commercial" ? "byCommercial" : "byProperty")}</h2>
    <p className="mb-5 text-sm text-text-muted">{commissionsOnly ? reports("commissionRanking") : t("performanceHint")}</p>
    {!rows.length ? <p className="py-8 text-center text-text-muted">{t("empty")}</p> : <Table>
      <TableHead><TableHeaderCell>{t(group)}</TableHeaderCell>{!commissionsOnly && <TableHeaderCell align="end">{t("feeCount")}</TableHeaderCell>}{columns.map((key) => <TableHeaderCell key={key} align="end">{t(key)}</TableHeaderCell>)}</TableHead>
      <TableBody>{rows.map((row) => <TableRow key={row.id ?? "unassigned"}>
        <TableCell label={t(group)}><span className="font-semibold">{row.name ?? (row.id ? `#${row.id}` : t("unassigned"))}</span></TableCell>
        {!commissionsOnly && <TableCell label={t("feeCount")} className="text-end tabular-nums">{row.fee_count}</TableCell>}
        {columns.map((key) => <TableCell key={key} label={t(key)} className="text-end font-mono tabular-nums">{money(row[key])}</TableCell>)}
      </TableRow>)}</TableBody>
    </Table>}
  </Card>;
}

export function FinanceDashboard({ mode = "finance" }: { mode?: "finance" | "commissions" | "reports" }) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const reports = useTranslations("BusinessReports");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const today = financeToday();
  const [filters, setFilters] = useState<FinanceFilters>({ from: mode === "reports" ? today : `${today.slice(0, 4)}-01-01`, to: today, property_id: "", commercial_id: "", ...(mode === "commissions" ? { kind: "commission" as const } : {}) });
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [reportDate, setReportDate] = useState(today);
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [options, setOptions] = useState<FinanceOptions>({ properties: [], commercials: [] });
  const [search, setSearch] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<{ id: number; title: string } | null>(null);
  const [state, setState] = useState<{ key: string; data: FinanceReport | null; error: string }>({ key: "", data: null, error: "" });
  const key = JSON.stringify({ filters, page, version, locale });
  const loading = state.key !== key;
  const data = loading ? null : state.data;
  const money = (cents: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "MAD", maximumFractionDigits: 2 }).format(cents / 100);
  const day = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const refresh = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const request = JSON.parse(key) as { filters: FinanceFilters; page: number };
    getFinanceReport(request.filters, request.page).then((report) => {
      if (!cancelled) setState({ key, data: report, error: "" });
    }).catch((error) => {
      if (!cancelled) setState({ key, data: null, error: error instanceof ApiError ? error.message : t("loadError") });
    });
    return () => { cancelled = true; };
  }, [key, isAdmin, t]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getFinanceOptions(search).then((result) => { if (!cancelled) { setOptions(result); setOptionsError(""); } })
        .catch(() => { if (!cancelled) setOptionsError(t("loadError")); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, isAdmin, t]);

  function choosePeriod(next: "daily" | "weekly", date: string) {
    setPeriod(next); setReportDate(date);
    if (!date) return;
    const start = new Date(date + "T12:00:00Z");
    if (next === "weekly") start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    const end = new Date(start);
    if (next === "weekly") end.setUTCDate(end.getUTCDate() + 6);
    const range = { ...filters, from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    setDraft(range); setFilters(range); setPage(1);
  }
  function apply(event: FormEvent) { event.preventDefault(); setPage(1); setFilters({ ...draft }); }
  function openEntry(entry?: FinancialEntry) {
    modal.custom({ title: t(entry ? "editEntry" : "addEntry"), content: <FinanceEntryForm entry={entry} onSaved={refresh} fixedKind={mode === "commissions" ? "commission" : undefined} /> });
  }
  function remove(entry: FinancialEntry) {
    modal.confirm({ message: t("deleteConfirm", { label: entry.label }), confirmLabel: t("delete"), cancelLabel: t("cancel"), onConfirm: async () => {
      try { await deleteFinancialEntry(entry.id); setPage(1); refresh(); }
      catch (error) { modal.error(error instanceof ApiError ? error.message : t("saveError")); }
    } });
  }

  if (!isAdmin) return <p className="text-text-muted">{t("restricted")}</p>;
  const properties = selectedProperty && !options.properties.some((p) => p.id === selectedProperty.id) ? [selectedProperty, ...options.properties] : options.properties;
  const maxTrend = Math.max(1, ...(data?.trend.flatMap((row) => [row.revenue, row.expenses + row.commissions]) ?? []));
  return <div className="space-y-6">
    {mode === "reports" && <style>{"@media print { body { background: white !important; } aside, main button, main form, main select, main input, body > div > div > header { display: none !important; } main { padding: 0 !important; } }"}</style>}
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-gold-primary uppercase"><Wallet size={16} />KHADMATONA IMMO · MAD</p><h1 className="font-display text-3xl font-semibold text-text">{mode === "finance" ? t("title") : reports(mode === "commissions" ? "commissionsTitle" : "title")}</h1><p className="mt-2 max-w-2xl text-sm text-text-muted">{mode === "finance" ? t("subtitle") : reports(mode === "commissions" ? "commissionsSubtitle" : "subtitle")}</p></div>
      <Button onClick={() => openEntry()}><Plus size={17} />{t("addEntry")}</Button>
    </header>
    {mode === "reports" && <Card><div className="flex flex-wrap items-end gap-4">
      <Select label={reports("period")} value={period} onChange={(e) => choosePeriod(e.target.value as "daily" | "weekly", reportDate)}><option value="daily">{reports("daily")}</option><option value="weekly">{reports("weekly")}</option></Select>
      <Field type="date" label={reports("date")} value={reportDate} onChange={(e) => choosePeriod(period, e.target.value)} />
      <Button variant="secondary" disabled={loading || !!state.error} onClick={() => window.print()}>{reports("print")}</Button>
    </div></Card>}
    <Card>
      <form onSubmit={apply} className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t("from")} type="date" value={draft.from} max={draft.to} required onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        <Field label={t("to")} type="date" value={draft.to} min={draft.from} required onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        <Select label={t("commercial")} value={draft.commercial_id} onChange={(e) => setDraft({ ...draft, commercial_id: e.target.value })}><option value="">{t("allCommercials")}</option>{options.commercials.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Field label={t("searchProperty")} type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select label={t("property")} value={draft.property_id} onChange={(e) => { setDraft({ ...draft, property_id: e.target.value }); setSelectedProperty(properties.find((p) => p.id === Number(e.target.value)) ?? null); }}><option value="">{t("allProperties")}</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>
        <div className="flex gap-2"><Button type="submit">{t("apply")}</Button><Button type="button" variant="secondary" onClick={refresh} aria-label={t("refresh")}><RefreshCw size={17} /></Button></div>
      </form>
      <p className="mt-3 text-xs text-text-muted">{t("rangeHint")}</p>
      {optionsError && <p role="alert" className="mt-3 text-sm text-error">{optionsError}</p>}
    </Card>
    <p className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-text-muted">{t("scope")} <Link href="/dashboard/rental/finances" className="font-semibold text-gold-primary underline">{t("rentalLink")}</Link></p>
    {mode === "reports" && <p className="text-sm font-semibold text-text">{day(filters.from)} ? {day(filters.to)}</p>}
    {mode === "reports" && <ActivityReport filters={filters} version={version} />}
    {loading ? <div role="status" aria-label={t("loading")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div> : state.error ? <Card><p role="alert" className="text-error">{state.error}</p><Button variant="secondary" className="mt-4" onClick={refresh}>{t("retry")}</Button></Card> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(mode === "commissions" ? ["commissions", "disbursements"] as const : ["revenue", "commissions", "expenses", "receipts"] as const).map((metric) => <StatCard key={metric} label={metric === "disbursements" ? reports("commissionPayments") : t(metric)} value={money(data.totals[metric])} hint={metric === "disbursements" ? reports("commissionPaymentsHint") : t(`${metric}Hint`)} />)}</div>
      {mode !== "commissions" && <div className="grid gap-4 sm:grid-cols-3">{(["margin", "cash_balance", "unpaid"] as const).map((metric) => <StatCard key={metric} label={t(metric)} value={money(data.totals[metric])} hint={t(`${metric}Hint`)} />)}</div>}
      {mode !== "commissions" && <Card>
        <h2 className="font-display text-xl font-semibold text-text">{t("trend")}</h2>
        <div className="my-4 flex flex-wrap gap-5 text-xs text-text-muted"><span><span className="me-2 inline-block h-2.5 w-2.5 rounded bg-gold-primary" />{t("revenue")}</span><span><span className="me-2 inline-block h-2.5 w-2.5 rounded bg-text-muted" />{t("costs")}</span></div>
        <div className="space-y-4">{data.trend.map((row) => <div key={row.month} className="grid gap-2 sm:grid-cols-[100px_1fr]">
          <span className="text-sm font-medium text-text">{new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${row.month}-01T12:00:00Z`))}</span>
          <div className="space-y-1.5">{[{ label: t("revenue"), value: row.revenue, color: "bg-gold-primary" }, { label: t("costs"), value: row.expenses + row.commissions, color: "bg-text-muted" }].map((bar) => <div key={bar.label} className="flex items-center gap-3" aria-label={`${bar.label}: ${money(bar.value)}`}><div className="h-2 flex-1 overflow-hidden rounded bg-surface-muted"><div className={`h-full rounded ${bar.color}`} style={{ width: `${bar.value / maxTrend * 100}%` }} /></div><span className="min-w-28 text-end font-mono text-xs text-text-muted">{money(bar.value)}</span></div>)}</div>
        </div>)}</div>
      </Card>}
      <PerformanceTable rows={data.commercials} group="commercial" commissionsOnly={mode === "commissions"} />
      <PerformanceTable rows={data.properties} group="property" commissionsOnly={mode === "commissions"} />
      <Card>
        <h2 className="mb-2 font-display text-xl font-semibold text-text">{t("ledger")}</h2><p className="mb-5 text-sm text-text-muted">{t("ledgerHint")}</p>
        {!data.entries.length ? <div className="py-8 text-center"><p className="mb-4 text-text-muted">{t("empty")}</p><Button onClick={() => openEntry()}>{t("addEntry")}</Button></div> : <Table>
          <TableHead>{["occurredOn", "label", "property", "commercial", "amount", "paidOn", "actions"].map((heading) => <TableHeaderCell key={heading}>{t(heading)}</TableHeaderCell>)}</TableHead>
          <TableBody>{data.entries.map((entry) => <TableRow key={entry.id}>
            <TableCell label={t("occurredOn")}>{day(entry.occurred_on)}</TableCell>
            <TableCell label={t("label")}><strong>{entry.label}</strong><span className="block text-xs text-text-muted">{t(`kinds.${entry.kind}`)}</span></TableCell>
            <TableCell label={t("property")}>{entry.property_title ?? t("unassigned")}</TableCell>
            <TableCell label={t("commercial")}>{entry.commercial_name ?? t("unassigned")}</TableCell>
            <TableCell label={t("amount")} className="font-mono tabular-nums">{money(entry.amount_cents)}</TableCell>
            <TableCell label={t("paidOn")}>{entry.paid_on ? day(entry.paid_on) : <span className="text-text-muted">{t("unpaidStatus")}</span>}</TableCell>
            <TableCell label={t("actions")}><div className="flex gap-1"><Button size="sm" variant="secondary" aria-label={t("editEntry")} onClick={() => openEntry(entry)}><Pencil size={15} /></Button><Button size="sm" variant="secondary" aria-label={t("delete")} onClick={() => remove(entry)}><Trash2 size={15} /></Button></div></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
        {data.pagination.last_page > 1 && <div className="mt-5"><Pagination pagination={data.pagination} onPageChange={setPage} /></div>}
      </Card>
    </>}
  </div>;
}
