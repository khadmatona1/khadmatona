"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type Report = { id: number; user_id: number; report_date: string; content: string; user: { id: number; name: string } };
type Pagination = { current_page: number; last_page: number };
const fieldClass = "min-h-11 w-full rounded-md border border-border bg-bg p-2 text-base text-text";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function DailyReports({ options }: { options: { id: number; name: string }[] }) {
  const t = useTranslations("DailyReports");
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("reportType")}>
      {(["daily", "weekly"] as const).map((value) => <Button key={value} type="button" variant={period === value ? "primary" : "secondary"} aria-pressed={period === value} onClick={() => setPeriod(value)}>{t(value)}</Button>)}
    </div>
    <ReportPanel key={period} options={options} period={period} />
  </div>;
}

function monday(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7);
  return value.toISOString().slice(0, 10);
}

function ReportPanel({ options, period }: { options: { id: number; name: string }[]; period: "daily" | "weekly" }) {
  const weekly = period === "weekly";
  const endpoint = `/api/v1/${period}-reports`;
  const wt = useTranslations("WeeklyReports");
  const t = useTranslations("DailyReports");
  const { user } = useAuth();
  const admin = user?.roles?.includes("Admin") ?? false;
  const canWrite = user?.roles?.some((role) => role === "Commercial" || role === "SeniorCommercial") ?? false;
  const [reportDate, setReportDate] = useState(() => weekly ? monday(today()) : today());
  const [content, setContent] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [author, setAuthor] = useState("");
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editorLoading, setEditorLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editorError, setEditorError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ page: String(page) });
    if (dateFilter) query.set("date", dateFilter);
    if (admin && author) query.set("user_id", author);
    api.getWithMeta<Report[]>(`${endpoint}?${query}`).then((result) => {
      if (!cancelled) { setReports(result.data); setPagination(result.meta?.pagination as Pagination); setError(""); }
    }).catch(() => { if (!cancelled) setError(t("loadError")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [admin, author, dateFilter, page, version, t, endpoint]);

  useEffect(() => {
    if (!canWrite || !user) return;
    let cancelled = false;
    const query = new URLSearchParams({ date: reportDate, user_id: String(user.id) });
    api.get<Report[]>(`${endpoint}?${query}`).then((result) => {
      if (!cancelled) { setContent(result.find((report) => report.user_id === user.id)?.content ?? ""); setEditorError(""); setEditorReady(true); }
    }).catch(() => { if (!cancelled) setEditorError(t("loadError")); })
      .finally(() => { if (!cancelled) setEditorLoading(false); });
    return () => { cancelled = true; };
  }, [canWrite, reportDate, user, t, editorVersion, endpoint]);

  function changeDate(value: string) {
    if (!value) return;
    setReportDate(weekly ? monday(value) : value); setContent(""); setEditorLoading(true); setEditorReady(false); setEditorError(""); setSaved(false); setEditorVersion((current) => current + 1);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setEditorError(""); setSaved(false);
    try {
      await api.post<Report>(endpoint, { report_date: reportDate, content: content.trim() });
      setSaved(true); setVersion((value) => value + 1);
    } catch (caught) {
      setEditorError(caught instanceof ApiError ? Object.values(caught.errors).flat().join(" ") || t("saveError") : t("saveError"));
    } finally { setBusy(false); }
  }

  return <section className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
    <header className="flex items-start gap-3"><FileText className="mt-1 h-6 w-6 shrink-0 text-gold-primary" /><div><h2 className="text-lg font-semibold">{weekly ? wt("title") : t("title")}</h2><p className="mt-1 text-sm text-text-muted">{weekly ? wt(admin ? "adminHint" : "hint") : t(admin ? "adminHint" : "hint")}</p></div></header>
    {canWrite && <form onSubmit={save} className="space-y-3">
      <label className="block max-w-xs text-sm">{weekly ? wt("date") : t("date")}<input type="date" required max={today()} value={reportDate} disabled={busy} onChange={(event) => changeDate(event.target.value)} className={fieldClass} /></label>
      <label className="block text-sm">{t("content")}<textarea required rows={5} maxLength={10000} value={content} disabled={busy || editorLoading || !editorReady} onChange={(event) => { setContent(event.target.value); setSaved(false); }} placeholder={t("placeholder")} className={`${fieldClass} mt-1`} /></label>
      {editorLoading && <p role="status" className="text-sm text-text-muted">{t("loading")}</p>}
      {editorError && <p role="alert" className="text-sm text-error">{editorError}</p>}
      {!editorLoading && !editorReady && <Button type="button" variant="secondary" onClick={() => changeDate(reportDate)}>{t("retry")}</Button>}
      {saved && <p role="status" className="text-sm text-emerald-600">{t("saved")}</p>}
      <Button type="submit" isLoading={busy} disabled={editorLoading || !editorReady || !content.trim()}>{t("save")}</Button>
    </form>}
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">{t(admin ? "teamReports" : "history")}</h3>
      <div className="flex flex-wrap gap-3">
        {admin && <label className="min-w-0 flex-1 text-sm">{t("commercial")}<select className={fieldClass} value={author} onChange={(event) => { setAuthor(event.target.value); setPage(1); setLoading(true); }}><option value="">{t("allTeam")}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
        <label className="w-full text-sm sm:w-auto">{weekly ? wt("filterDate") : t("filterDate")}<input type="date" value={dateFilter} className={fieldClass} onChange={(event) => { setDateFilter(event.target.value); setPage(1); setLoading(true); }} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      {loading ? <p role="status" className="text-sm text-text-muted">{t("loading")}</p> : !error && !reports.length ? <p className="text-sm text-text-muted">{t("empty")}</p> : reports.map((report) => <article key={report.id} className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-semibold">{report.user.name}</span><time dateTime={report.report_date} className="ms-3 text-sm text-text-muted">{report.report_date.split("-").reverse().join("/")}</time></div>{canWrite && report.user_id === user?.id && <Button type="button" size="sm" variant="secondary" disabled={busy || editorLoading} onClick={() => { changeDate(report.report_date); }}>{t("edit")}</Button>}</div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm">{report.content}</p>
      </article>)}
      {pagination && pagination.last_page > 1 && <div className="flex items-center justify-between gap-2"><Button variant="secondary" size="sm" disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>{t("previous")}</Button><span className="text-sm">{page} / {pagination.last_page}</span><Button variant="secondary" size="sm" disabled={page >= pagination.last_page || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>{t("next")}</Button></div>}
    </div>
  </section>;
}
