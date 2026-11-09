"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnalyticsFiltersBar } from "@/components/analytics/analytics-filters";
import { BarList } from "@/components/analytics/bar-list";
import { JourneysList } from "@/components/analytics/journeys-list";
import { RealtimePanel } from "@/components/analytics/realtime-panel";
import { TrendChart } from "@/components/analytics/trend-chart";
import { countryFlag, countryName, formatDay, formatDuration, formatNumber, formatPercent } from "@/components/analytics/format";
import { useAnalyticsLabels } from "@/components/analytics/use-analytics-labels";
import { ApiError } from "@/lib/api";
import {
  getAnalyticsEvents,
  getAnalyticsForms,
  getAnalyticsJourneys,
  getAnalyticsOverview,
  getAnalyticsPages,
  getAnalyticsProperties,
  getAnalyticsSources,
} from "@/lib/analytics-reports";
import type { AnalyticsFilters } from "@/types/analytics";

const FILTERS_KEY = "khadmatona-analytics-filters";

interface ReportState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Loads one report whenever the filters change. Each section loads on its
 * own, so a slow report never holds up the others, and a stale response
 * (filters changed mid-flight) is discarded.
 */
function useReport<T>(fetcher: (filters: AnalyticsFilters) => Promise<T>, filters: AnalyticsFilters, fallbackError: string): ReportState<T> {
  const key = JSON.stringify(filters);
  const [state, setState] = useState<ReportState<T> & { key: string | null }>({ data: null, error: null, loading: true, key: null });

  useEffect(() => {
    let cancelled = false;
    fetcher(JSON.parse(key) as AnalyticsFilters)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false, key });
      })
      .catch((caught) => {
        if (!cancelled) setState({ data: null, error: caught instanceof ApiError ? caught.message : fallbackError, loading: false, key });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every filter; fetcher/fallbackError are stable
  }, [key]);

  return { data: state.data, error: state.error, loading: state.key !== key };
}

function readStoredFilters(): AnalyticsFilters {
  try {
    const stored = window.localStorage.getItem(FILTERS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AnalyticsFilters;
      if (parsed && typeof parsed.range === "string") return parsed;
    }
  } catch {
    // Storage unavailable - fall through to the default.
  }
  return { range: "7d" };
}

export function AnalyticsDashboard() {
  const t = useTranslations("Analytics");
  const locale = useLocale();
  const labels = useAnalyticsLabels();
  const [filters, setFilters] = useState<AnalyticsFilters>({ range: "7d" });
  const [journeyPage, setJourneyPage] = useState(1);

  // Restores the Admin's last filters (per browser convenience only).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage, which isn't readable during SSR
    setFilters(readStoredFilters());
  }, []);

  function changeFilters(next: AnalyticsFilters) {
    setFilters(next);
    setJourneyPage(1);
    try {
      window.localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
    } catch {
      // Non-essential.
    }
  }

  const error = t("loadError");
  const overview = useReport(getAnalyticsOverview, filters, error);
  const sources = useReport(getAnalyticsSources, filters, error);
  const pages = useReport(getAnalyticsPages, filters, error);
  const properties = useReport(getAnalyticsProperties, filters, error);
  const forms = useReport(getAnalyticsForms, filters, error);
  const events = useReport(getAnalyticsEvents, filters, error);
  const journeyFilters = useMemo(() => ({ ...filters, page_number: journeyPage }), [filters, journeyPage]);
  const journeys = useReport(
    (value: AnalyticsFilters & { page_number?: number }) => getAnalyticsJourneys(value, value.page_number ?? 1, 10),
    journeyFilters,
    error,
  );

  const n = (value: number) => formatNumber(value, locale);
  const pct = (value: number) => formatPercent(value, locale);

  const cards = overview.data?.cards;
  const series = overview.data?.series ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      <AnalyticsFiltersBar
        value={filters}
        onChange={changeFilters}
        pageOptions={(pages.data?.pages ?? []).map((page) => page.path)}
        propertyOptions={(properties.data?.properties ?? []).map((property) => ({ id: property.property_id, title: property.title }))}
      />

      <RealtimePanel />

      {/* Overview cards. The first three are fixed calendar windows. The
          rest follow the selected range and filters. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {!cards
          ? Array.from({ length: 8 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-16" />
              </Card>
            ))
          : [
              { label: t("cards.visitorsToday"), value: n(cards.visitors_today) },
              { label: t("cards.visitorsWeek"), value: n(cards.visitors_week) },
              { label: t("cards.visitorsMonth"), value: n(cards.visitors_month) },
              { label: t("cards.sessions"), value: n(cards.sessions), hint: t("cards.uniqueVisitors", { count: cards.visitors }) },
              { label: t("cards.pageViews"), value: n(cards.page_views) },
              { label: t("cards.avgSession"), value: formatDuration(cards.avg_session_seconds, locale), hint: t("cards.bounceRate", { rate: pct(cards.bounce_rate) }) },
              { label: t("cards.leads"), value: n(cards.leads), hint: t("cards.leadsHint") },
              {
                label: t("cards.conversionRate"),
                value: pct(cards.conversion_rate),
                hint: t("cards.conversionHint", { converted: cards.converted_sessions, sessions: cards.sessions }),
              },
            ].map((card) => <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />)}
      </div>
      {overview.error && <p className="text-sm text-error">{overview.error}</p>}

      {/* Small multiples: one metric per chart, each on its own scale. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {(
          [
            ["visitors", t("charts.visitors")],
            ["page_views", t("charts.pageViews")],
            ["leads", t("charts.leads")],
          ] as const
        ).map(([metric, title]) => (
          <Section key={metric} title={title}>
            {overview.loading && !overview.data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <TrendChart
                title={title}
                data={series.map((point) => ({ label: formatDay(point.date, locale), value: point[metric] }))}
                formatValue={n}
              />
            )}
          </Section>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("sections.trafficSources")}>
          {!overview.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarList
              emptyLabel={t("empty")}
              items={overview.data.sources.map((row) => ({
                key: row.source,
                label: t(`sources.${row.source}`),
                value: row.sessions,
                display: n(row.sessions),
                hint: t("conversionsHint", { count: row.conversions }),
              }))}
            />
          )}
        </Section>
        <Section title={t("sections.funnel")} hint={t("funnel.hint")}>
          {!overview.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarList
              emptyLabel={t("empty")}
              max={overview.data.funnel.sessions}
              items={(["sessions", "property_viewers", "form_starters", "converters"] as const).map((stage) => {
                const value = overview.data!.funnel[stage];
                const base = overview.data!.funnel.sessions;
                return {
                  key: stage,
                  label: t(`funnel.${stage}`),
                  value,
                  display: `${n(value)} · ${pct(base > 0 ? Math.round((value / base) * 1000) / 10 : 0)}`,
                };
              })}
            />
          )}
        </Section>
      </div>

      {/* Sources detail: UTM campaigns, referrers, devices, geography. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section title={t("sections.campaigns")}>
          {sources.loading && !sources.data ? (
            <TableSkeleton rows={4} columns={4} />
          ) : !sources.data || sources.data.campaigns.length === 0 ? (
            <p className="text-sm text-text-muted">{t("noCampaigns")}</p>
          ) : (
            <Table>
              <TableHead>
                <TableHeaderCell>{t("columns.utmSource")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.utmMedium")}</TableHeaderCell>
                <TableHeaderCell>{t("columns.utmCampaign")}</TableHeaderCell>
                <TableHeaderCell align="end">{t("columns.sessions")}</TableHeaderCell>
                <TableHeaderCell align="end">{t("columns.conversion")}</TableHeaderCell>
              </TableHead>
              <TableBody>
                {sources.data.campaigns.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell label={t("columns.utmSource")}>{row.utm_source ?? "—"}</TableCell>
                    <TableCell label={t("columns.utmMedium")}>{row.utm_medium ?? "—"}</TableCell>
                    <TableCell label={t("columns.utmCampaign")}>{row.utm_campaign ?? "—"}</TableCell>
                    <NumCell label={t("columns.sessions")}>{n(row.sessions)}</NumCell>
                    <NumCell label={t("columns.conversion")}>{pct(row.conversion_rate)}</NumCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
        <Section title={t("sections.referrers")}>
          {!sources.data ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <BarList
              emptyLabel={t("empty")}
              items={sources.data.referrers.map((row) => ({ key: row.host, label: <bdi dir="ltr">{row.host}</bdi>, value: row.sessions, display: n(row.sessions) }))}
            />
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {(
          [
            ["devices", t("sections.devices"), (value: string | null) => (value ? t(`devices.${value}`) : t("unknown"))],
            ["browsers", t("sections.browsers"), (value: string | null) => value ?? t("unknown")],
            ["operating_systems", t("sections.os"), (value: string | null) => value ?? t("unknown")],
            ["countries", t("sections.countries"), (value: string | null) => (value ? `${countryFlag(value)} ${countryName(value, locale)}` : t("unknown"))],
          ] as const
        ).map(([key, title, format]) => (
          <Section key={key} title={title}>
            {!sources.data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <BarList
                emptyLabel={t("empty")}
                items={sources.data[key].map((row) => ({ key: row.value ?? "unknown", label: format(row.value), value: row.sessions, display: n(row.sessions) }))}
              />
            )}
          </Section>
        ))}
      </div>

      {/* Pages */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Section title={t("sections.topPages")} className="xl:col-span-2">
          {pages.loading && !pages.data ? (
            <TableSkeleton rows={5} columns={5} />
          ) : !pages.data || pages.data.pages.length === 0 ? (
            <p className="text-sm text-text-muted">{t("empty")}</p>
          ) : (
            <Table>
              <TableHead>
                <TableHeaderCell>{t("columns.page")}</TableHeaderCell>
                <TableHeaderCell align="end">{t("columns.views")}</TableHeaderCell>
                <TableHeaderCell align="end">{t("columns.uniqueVisitors")}</TableHeaderCell>
                <TableHeaderCell align="end">{t("columns.avgTime")}</TableHeaderCell>
                <TableHeaderCell align="end">{t("columns.exitRate")}</TableHeaderCell>
              </TableHead>
              <TableBody>
                {pages.data.pages.map((row) => (
                  <TableRow key={row.path}>
                    <TableCell label={t("columns.page")} className="max-w-[280px] truncate">
                      <button
                        type="button"
                        onClick={() => changeFilters({ ...filters, page: row.path })}
                        className="font-mono text-[0.8rem] hover:text-gold-primary hover:underline"
                        title={t("filterBy", { value: row.path })}
                        dir="ltr"
                      >
                        {row.path}
                      </button>
                    </TableCell>
                    <NumCell label={t("columns.views")}>{n(row.views)}</NumCell>
                    <NumCell label={t("columns.uniqueVisitors")}>{n(row.visitors)}</NumCell>
                    <NumCell label={t("columns.avgTime")}>{formatDuration(row.avg_seconds, locale)}</NumCell>
                    <NumCell label={t("columns.exitRate")}>{pct(row.exit_rate)}</NumCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
        <Section title={t("sections.exitPages")} hint={t("exitHint")}>
          {!pages.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarList
              emptyLabel={t("empty")}
              items={pages.data.exit_pages.map((row) => ({
                key: row.path,
                label: <bdi dir="ltr" className="font-mono text-[0.8rem]">{row.path}</bdi>,
                value: row.exits,
                display: `${n(row.exits)} · ${pct(row.sessions_share)}`,
              }))}
            />
          )}
        </Section>
      </div>

      {/* Properties */}
      <Section title={t("sections.topProperties")}>
        {properties.loading && !properties.data ? (
          <TableSkeleton rows={5} columns={7} />
        ) : !properties.data || properties.data.properties.length === 0 ? (
          <p className="text-sm text-text-muted">{t("empty")}</p>
        ) : (
          <Table>
            <TableHead>
              <TableHeaderCell>{t("columns.property")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("columns.views")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("columns.uniqueVisitors")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("columns.avgTime")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("columns.ctaClicks")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("columns.leads")}</TableHeaderCell>
              <TableHeaderCell align="end">{t("columns.conversion")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {properties.data.properties.map((row) => (
                <TableRow key={row.property_id}>
                  <TableCell label={t("columns.property")} className="max-w-[260px] truncate font-semibold">
                    <Link href={`/dashboard/properties/${row.property_id}`} className="hover:text-gold-primary hover:underline">
                      #{row.property_id} {row.title ?? t("deletedProperty")}
                    </Link>
                  </TableCell>
                  <NumCell label={t("columns.views")}>{n(row.views)}</NumCell>
                  <NumCell label={t("columns.uniqueVisitors")}>{n(row.visitors)}</NumCell>
                  <NumCell label={t("columns.avgTime")}>{formatDuration(row.avg_seconds, locale)}</NumCell>
                  <NumCell label={t("columns.ctaClicks")}>
                    {n(row.cta_clicks)}
                    {row.contact_clicks > 0 && <span className="text-text-muted"> ({t("contactClicks", { count: row.contact_clicks })})</span>}
                  </NumCell>
                  <NumCell label={t("columns.leads")}>{n(row.leads)}</NumCell>
                  <NumCell label={t("columns.conversion")}>{pct(row.conversion_rate)}</NumCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Forms */}
      <Section title={t("sections.forms")} hint={t("formsHint")}>
        {forms.loading && !forms.data ? (
          <TableSkeleton rows={4} columns={6} />
        ) : !forms.data || forms.data.forms.length === 0 ? (
          <p className="text-sm text-text-muted">{t("empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {forms.data.forms.map((form) => (
              <div key={form.form_type} className="rounded-md border border-border p-4">
                <p className="font-semibold text-text">{t(`forms.${form.form_type}`)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Metric label={t("formStats.started")} value={n(form.started)} />
                  <Metric label={t("formStats.submitted")} value={n(form.submitted)} />
                  <Metric label={t("formStats.abandoned")} value={n(form.abandoned)} />
                  <Metric label={t("formStats.conversion")} value={pct(form.conversion_rate)} strong />
                  {form.in_progress > 0 && <Metric label={t("formStats.inProgress")} value={n(form.in_progress)} />}
                  {form.avg_seconds_to_submit !== null && <Metric label={t("formStats.avgTime")} value={formatDuration(form.avg_seconds_to_submit, locale)} />}
                </dl>
                {/* Started -> submitted as a two-segment bar. */}
                <div className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                  <div className="h-full rounded-full bg-success" style={{ width: `${form.started ? (form.submitted / form.started) * 100 : 0}%` }} />
                  <div className="h-full rounded-full bg-warning" style={{ width: `${form.started ? (form.abandoned / form.started) * 100 : 0}%` }} />
                </div>
                {form.drop_off_fields.length > 0 && (
                  <p className="mt-3 text-[0.78rem] text-text-muted">
                    {t("formStats.dropOff")}{" "}
                    {form.drop_off_fields.map((field) => `${labels.field(field.field)} (${n(field.count)})`).join(locale === "ar" ? "، " : ", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Events */}
        <Section title={t("sections.events")}>
          {!events.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarList
              emptyLabel={t("empty")}
              items={events.data.events
                .filter((row) => row.count > 0)
                .map((row) => ({
                  key: row.event_type,
                  label: t.has(`events.${row.event_type}`) ? t(`events.${row.event_type}`) : row.event_type,
                  value: row.count,
                  display: n(row.count),
                  hint: t("sessionsHint", { count: row.sessions }),
                }))}
            />
          )}
        </Section>

        {/* Journeys */}
        <Section title={t("sections.journeys")} hint={t("journeysHint")} className="xl:col-span-2">
          {journeys.loading && !journeys.data ? (
            <Skeleton className="h-48 w-full" />
          ) : journeys.error ? (
            <p className="text-sm text-error">{journeys.error}</p>
          ) : (
            <>
              <JourneysList journeys={journeys.data?.journeys ?? []} emptyLabel={t("empty")} />
              {journeys.data && (
                <div className="mt-4">
                  <Pagination pagination={journeys.data.pagination} onPageChange={setJourneyPage} />
                </div>
              )}
            </>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, hint, className, children }: { title: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <Card className={className}>
      <div className="mb-4">
        <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{title}</p>
        {hint && <p className="mt-1 text-[0.78rem] text-text-muted">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

function NumCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TableCell label={label} className="text-end font-mono tabular-nums">
      {children}
    </TableCell>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[0.72rem] text-text-muted uppercase">{label}</dt>
      <dd className={strong ? "font-mono text-lg font-semibold text-gold-primary tabular-nums" : "font-mono font-semibold text-text tabular-nums"}>{value}</dd>
    </div>
  );
}
