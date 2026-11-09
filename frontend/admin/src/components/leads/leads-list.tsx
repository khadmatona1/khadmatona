"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Download } from "lucide-react";
import { modal } from "@/lib/modal";
import { LeadDetailContent } from "@/components/leads/lead-detail-content";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Select } from "@/components/ui/select";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  PhoneCallIcon,
  TrashIcon,
  WhatsAppIcon,
} from "@/components/ui/action-icons";
import { LeadStatusBadge } from "@/components/leads/status-badge";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { exportLeadsToExcel } from "@/lib/export-leads";
import { ImportLeads } from "@/components/leads/import-leads";
import { deleteLead, listLeads } from "@/lib/leads";
import { MOROCCO_TZ, moroccoShortDateTimeFormatter } from "@/lib/morocco-time";
import { LEAD_STATUSES, type Lead, type LeadStatus, type LeadType } from "@/types/lead";
import type { Pagination as PaginationData } from "@/types/property";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

// Moroccan numbers are often typed in local format (e.g. "06 12 34 56 78")
// rather than E.164 - wa.me needs the full international digits with no
// leading zero, so a local trunk "0" is swapped for the "212" country code.
function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `212${digits.slice(1)}` : digits;
}

/** "YYYY-MM-DD" for today in Morocco (en-CA formats dates as ISO). */
function moroccoToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MOROCCO_TZ }).format(new Date());
}

export function LeadsList({
  type,
  title,
  subtitle,
}: {
  /** Omit to list every type at once - used by the Commercial "My Leads"
   * view, which isn't scoped to a single lead type the way the Admin
   * per-type pages (contact/sell/rent/visit) are. */
  type?: LeadType;
  title: string;
  subtitle: string;
}) {
  const t = useTranslations("DashboardLeads");
  const propertyLabels = useTranslations("Leads");
  // Upper bound for the date pickers: today in Morocco time.
  const today = moroccoToday();
  const leadType = useTranslations("LeadType");
  const leadStatus = useTranslations("LeadStatus");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const canImport = isAdmin || user?.roles?.some((role) => role === "Commercial" || role === "SeniorCommercial") === true;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  // "Reçu le" range as Morocco calendar days. The picker only reports a
  // complete from-to range (or null when cleared), so the list never
  // reloads on a half-chosen range.
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const createdFrom = dateRange?.from ?? "";
  const createdTo = dateRange?.to ?? "";
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);
  // Keyed by id (not a plain Set) so the full Lead object is still on hand
  // at export time even after paging away from where it was checked -
  // selection deliberately persists across page/search/filter changes so
  // picking leads across several pages works as expected.
  const [selectedLeads, setSelectedLeads] = useState<Map<number, Lead>>(new Map());
  const [commercials, setCommercials] = useState<{ id: number; name: string }[]>([]);
  const [assignmentTarget, setAssignmentTarget] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    api.get<{ id: number; name: string }[]>("/api/v1/leads/assignment-options")
      .then((options) => { if (!cancelled) setCommercials(options); })
      .catch(() => { if (!cancelled) setAssignmentError(t("assignmentLoadError")); });
    return () => { cancelled = true; };
  }, [isAdmin, t]);

  async function assignSelected() {
    if (!assignmentTarget || !selectedLeads.size || assigning) return;
    setAssigning(true); setAssignmentError(""); setAssignmentMessage("");
    try {
      const result = await api.post<{ assigned: number }>("/api/v1/leads/assign", {
        lead_ids: Array.from(selectedLeads.keys()), commercial_id: Number(assignmentTarget),
      });
      setSelectedLeads(new Map());
      setImportVersion((value) => value + 1);
      setAssignmentMessage(t("assignmentSuccess", { count: result.assigned }));
    } catch {
      setAssignmentError(t("assignmentError"));
    } finally { setAssigning(false); }
  }
  const [isExporting, setIsExporting] = useState(false);
  const [importVersion, setImportVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listLeads({
          type,
          page,
          search,
          status: statusFilter || undefined,
          createdFrom: createdFrom || undefined,
          createdTo: createdTo || undefined,
        });
        if (cancelled) return;
        setLeads(result.leads);
        setPagination(result.pagination);
      } catch (caught) {
        if (cancelled) return;
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [type, page, search, statusFilter, createdFrom, createdTo, importVersion]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value as LeadStatus | "");
    setPage(1);
  }

  function handleDateRangeChange(range: DateRange | null) {
    setDateRange(range);
    setPage(1);
  }

  function handleDelete(lead: Lead) {
    modal.confirm({
      message: t("confirmDelete", { name: lead.name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(lead.id);
        try {
          await deleteLead(lead.id);
          setLeads((current) => current.filter((l) => l.id !== lead.id));
          modal.success(t("deleteSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  function handleView(lead: Lead) {
    modal.custom({
      content: (
        <LeadDetailContent
          id={lead.id}
          onUpdated={(updated) =>
            setLeads((current) => current.map((l) => (l.id === updated.id ? updated : l)))
          }
          onDeleted={() => setLeads((current) => current.filter((l) => l.id !== lead.id))}
        />
      ),
    });
  }

  async function handleCopyPhone(lead: Lead) {
    if (!lead.phone) return;
    await navigator.clipboard.writeText(lead.phone);
    setCopiedPhoneId(lead.id);
    setTimeout(() => setCopiedPhoneId((current) => (current === lead.id ? null : current)), 1500);
  }

  function toggleSelected(lead: Lead) {
    setSelectedLeads((current) => {
      const next = new Map(current);
      if (next.has(lead.id)) {
        next.delete(lead.id);
      } else {
        next.set(lead.id, lead);
      }
      return next;
    });
  }

  const allOnPageSelected = leads.length > 0 && leads.every((lead) => selectedLeads.has(lead.id));

  function toggleSelectAllOnPage() {
    setSelectedLeads((current) => {
      const next = new Map(current);
      if (allOnPageSelected) {
        for (const lead of leads) next.delete(lead.id);
      } else {
        for (const lead of leads) next.set(lead.id, lead);
      }
      return next;
    });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      // Selected leads (possibly spanning several pages) take priority; with
      // nothing checked, export everything matching the current search/
      // status filter instead - same "export all" fallback as
      // CommercialLeadsList's own export button.
      const toExport =
        selectedLeads.size > 0
          ? Array.from(selectedLeads.values())
          : (
              await listLeads({
                type,
                page: 1,
                perPage: 10000,
                search,
                status: statusFilter || undefined,
                createdFrom: createdFrom || undefined,
                createdTo: createdTo || undefined,
              })
            ).leads;

      if (toExport.length === 0) {
        modal.error(t("exportEmpty"));
        return;
      }

      await exportLeadsToExcel(
        toExport,
        {
          type: t("type"),
          name: t("name"),
          email: t("email"),
          phone: t("phone"),
          status: t("status"),
          city: t("exportCity"),
          district: t("exportDistrict"),
          address: t("exportAddress"),
          message: t("exportMessage"),
          submittedOn: t("submittedOn"),
        },
        leadType,
        leadStatus,
      );
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("exportError"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full max-w-sm items-center gap-2"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full min-w-0 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
            />
          </form>
          <div className="w-full sm:max-w-56">
            <Select
              label={t("status")}
              value={statusFilter}
              onChange={(event) => handleStatusFilterChange(event.target.value)}
            >
              <option value="">{t("allStatuses")}</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {leadStatus(status)}
                </option>
              ))}
            </Select>
          </div>
          <DateRangePicker label={t("dateRange")} value={dateRange} max={today} onChange={handleDateRangeChange} />
        </div>

        <div className="flex items-start gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} isLoading={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting
              ? t("exporting")
              : selectedLeads.size > 0
                ? t("exportSelected", { count: selectedLeads.size })
                : t("exportExcel")}
          </Button>
          {canImport && <ImportLeads type={type} onImported={() => { setPage(1); setSelectedLeads(new Map()); setImportVersion((value) => value + 1); }} />}
        </div>
      </div>

      {isAdmin && selectedLeads.size > 0 && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
          <span className="self-center text-sm">{t("selectedCount", { count: selectedLeads.size })}</span>
          <Select label={t("assignCommercial")} value={assignmentTarget} onChange={(event) => setAssignmentTarget(event.target.value)} disabled={assigning}>
            <option value="">{t("chooseCommercial")}</option>
            {commercials.map((commercial) => <option key={commercial.id} value={commercial.id}>{commercial.name}</option>)}
          </Select>
          <Button type="button" onClick={assignSelected} isLoading={assigning} disabled={!assignmentTarget || selectedLeads.size > 500}>{t("assignSelected")}</Button>
          <Button type="button" variant="secondary" disabled={assigning} onClick={() => setSelectedLeads(new Map())}>{t("clearSelection")}</Button>
        </div>
      )}
      {assignmentMessage && <p role="status" className="text-sm text-success">{assignmentMessage}</p>}
      {assignmentError && <p role="alert" className="text-sm text-error">{assignmentError}</p>}

      {isLoading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noResultsTitle")}</h3>
          <p className="mt-2 text-sm text-text-muted">
            {search || createdFrom || createdTo ? t("noResultsWithSearch") : t("noResultsEmpty")}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  aria-label={t("selectAllOnPage")}
                  className="h-4 w-4 accent-[var(--color-gold-primary)]"
                />
              </TableHeaderCell>
              <TableHeaderCell>{t("name")}</TableHeaderCell>

              <TableHeaderCell>{t("phone")}</TableHeaderCell>
              <TableHeaderCell>{t("exportCity")}</TableHeaderCell>
              <TableHeaderCell>{propertyLabels("propertyTypeLabel")}</TableHeaderCell>
              <TableHeaderCell>{t("status")}</TableHeaderCell>
              <TableHeaderCell>{t("submittedOn")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleSelected(lead)}
                      aria-label={t("selectLead", { name: lead.name })}
                      className="h-4 w-4 accent-[var(--color-gold-primary)]"
                    />
                  </TableCell>
                  <TableCell label={t("name")} className="max-w-[200px] truncate font-semibold">
                    {lead.name}
                  </TableCell>
                  <TableCell label={t("phone")}>
                    {lead.phone ? (
                      <div className="flex items-center gap-1">
                        <bdi dir="ltr" className="whitespace-nowrap text-text">{lead.phone}</bdi>
                        <a
                          href={`https://wa.me/${toWhatsAppDigits(lead.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("openWhatsapp")}
                          aria-label={t("openWhatsapp")}
                          className="rounded-md p-1.5 text-text-muted hover:bg-[#25D366]/15 hover:text-[#25D366]"
                        >
                          <WhatsAppIcon />
                        </a>
                        {/* Mobile: tapping straight into the dialer is more
                            useful than copying a number you can't paste
                            anywhere as easily as on desktop. */}
                        <a
                          href={`tel:${lead.phone}`}
                          title={t("callPhone")}
                          aria-label={t("callPhone")}
                          className="rounded-md p-1.5 text-text-muted hover:bg-gold-primary/15 hover:text-gold-primary sm:hidden"
                        >
                          <PhoneCallIcon />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(lead)}
                          title={copiedPhoneId === lead.id ? t("phoneCopied") : t("copyPhone")}
                          aria-label={copiedPhoneId === lead.id ? t("phoneCopied") : t("copyPhone")}
                          className="hidden rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-gold-primary sm:block"
                        >
                          {copiedPhoneId === lead.id ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-text-muted">{t("noPhone")}</span>
                    )}
                  </TableCell>
                  <TableCell label={t("exportCity")}>{lead.city || "—"}</TableCell>
                  <TableCell label={propertyLabels("propertyTypeLabel")}>
                    {lead.property_type ? propertyLabels(`propertyType.${lead.property_type}`) : "—"}
                  </TableCell>
                  <TableCell label={t("status")}>
                    <LeadStatusBadge status={lead.status} />
                    {lead.status === "to_call_back" && (
                      <p
                        className={clsx(
                          "mt-1 text-xs",
                          !lead.callback_at || new Date(lead.callback_at) < new Date()
                            ? "font-semibold text-error"
                            : "text-text-muted",
                        )}
                      >
                        {lead.callback_at
                          ? moroccoShortDateTimeFormatter.format(new Date(lead.callback_at))
                          : t("noCallbackTime")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell label={t("submittedOn")}>
                    {dateFormatter.format(new Date(lead.created_at))}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-1">
                      <button
                        type="button"
                        onClick={() => handleView(lead)}
                        title={t("view")}
                        aria-label={t("view")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <EyeIcon />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(lead)}
                          disabled={deletingId === lead.id}
                          title={deletingId === lead.id ? t("deleting") : t("delete")}
                          aria-label={deletingId === lead.id ? t("deleting") : t("delete")}
                          className="rounded-md p-2 text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
