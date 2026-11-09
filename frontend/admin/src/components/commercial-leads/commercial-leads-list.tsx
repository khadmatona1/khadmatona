"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { modal } from "@/lib/modal";
import { CommercialLeadDetailContent } from "@/components/commercial-leads/commercial-lead-detail-content";
import {
  CommercialLeadFilters,
  EMPTY_COMMERCIAL_LEAD_FILTERS,
  type CommercialLeadFiltersValue,
} from "@/components/commercial-leads/commercial-lead-filters";
import { CommercialLeadStatusBadge } from "@/components/commercial-leads/status-badge";
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
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  MailIcon,
  PhoneCallIcon,
  TrashIcon,
  WhatsAppIcon,
} from "@/components/ui/action-icons";
import { ApiError } from "@/lib/api";
import { deleteCommercialLead, listCommercialLeads } from "@/lib/commercial-leads";
import { exportCommercialLeadsToExcel } from "@/lib/export-commercial-leads";
import { ImportLeads } from "@/components/leads/import-leads";
import type { CommercialLead } from "@/types/commercial-lead";
import type { Pagination as PaginationData } from "@/types/property";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

// Moroccan numbers are often typed in local format (e.g. "06 12 34 56 78")
// rather than E.164 - wa.me needs the full international digits with no
// leading zero, so a local trunk "0" is swapped for the "212" country code.
// Same helper as leads-list.tsx.
function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `212${digits.slice(1)}` : digits;
}

export function CommercialLeadsList() {
  const t = useTranslations("DashboardCommercialLeads");
  const professionalTypeT = useTranslations("ProfessionalType");
  const statusT = useTranslations("CommercialLeadStatus");
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CommercialLeadFiltersValue>(EMPTY_COMMERCIAL_LEAD_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);
  // Keyed by id (not a plain Set) so the full lead object is still on hand
  // at export time even after paging away from where it was checked -
  // selection deliberately persists across page/search/filter changes, same
  // as LeadsList's own selection state.
  const [selectedLeads, setSelectedLeads] = useState<Map<number, CommercialLead>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [importVersion, setImportVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listCommercialLeads({
          page,
          search,
          professionalType: filters.professionalType || undefined,
          status: filters.status || undefined,
          city: filters.city || undefined,
          createdFrom: filters.createdFrom || undefined,
          createdTo: filters.createdTo || undefined,
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
  }, [page, search, filters, importVersion]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleFiltersChange(next: CommercialLeadFiltersValue) {
    setPage(1);
    setFilters(next);
  }

  function handleDelete(lead: CommercialLead) {
    modal.confirm({
      message: t("confirmDelete", { name: lead.full_name }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(lead.id);
        try {
          await deleteCommercialLead(lead.id);
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

  function handleView(lead: CommercialLead) {
    modal.custom({
      content: (
        <CommercialLeadDetailContent
          id={lead.id}
          onUpdated={(updated) =>
            setLeads((current) => current.map((l) => (l.id === updated.id ? updated : l)))
          }
          onDeleted={() => setLeads((current) => current.filter((l) => l.id !== lead.id))}
        />
      ),
    });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      // Selected leads (possibly spanning several pages) take priority; with
      // nothing checked, export everything matching the current search/
      // filters instead - a large per_page in one request rather than
      // looping pages, matching how this API is already used elsewhere.
      const toExport =
        selectedLeads.size > 0
          ? Array.from(selectedLeads.values())
          : (
              await listCommercialLeads({
                page: 1,
                perPage: 10000,
                search,
                professionalType: filters.professionalType || undefined,
                status: filters.status || undefined,
                city: filters.city || undefined,
                createdFrom: filters.createdFrom || undefined,
                createdTo: filters.createdTo || undefined,
              })
            ).leads;

      if (toExport.length === 0) {
        modal.error(t("exportEmpty"));
        return;
      }

      await exportCommercialLeadsToExcel(
        toExport,
        {
          fullName: t("name"),
          companyName: t("company"),
          email: t("email"),
          phone: t("phone"),
          whatsapp: t("whatsapp"),
          city: t("city"),
          address: t("address"),
          position: t("position"),
          professionalType: t("professionalType"),
          status: t("status"),
          message: t("message"),
          submittedOn: t("submittedOn"),
        },
        professionalTypeT,
        statusT,
      );
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("exportError"));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleCopyEmail(lead: CommercialLead) {
    await navigator.clipboard.writeText(lead.email);
    setCopiedEmailId(lead.id);
    setTimeout(() => setCopiedEmailId((current) => (current === lead.id ? null : current)), 1500);
  }

  async function handleCopyPhone(lead: CommercialLead) {
    if (!lead.phone) return;
    await navigator.clipboard.writeText(lead.phone);
    setCopiedPhoneId(lead.id);
    setTimeout(() => setCopiedPhoneId((current) => (current === lead.id ? null : current)), 1500);
  }

  function toggleSelected(lead: CommercialLead) {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm items-center gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full min-w-0 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
          />
        </form>

        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            isLoading={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting
              ? t("exporting")
              : selectedLeads.size > 0
                ? t("exportSelected", { count: selectedLeads.size })
                : t("exportExcel")}
          </Button>
          <ImportLeads commercial onImported={() => { setPage(1); setSelectedLeads(new Map()); setImportVersion((value) => value + 1); }} />
        </div>
      </div>

      <CommercialLeadFilters value={filters} onChange={handleFiltersChange} />

      {isLoading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noResultsTitle")}</h3>
          <p className="mt-2 text-sm text-text-muted">
            {search ? t("noResultsWithSearch") : t("noResultsEmpty")}
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
              <TableHeaderCell>{t("company")}</TableHeaderCell>
              <TableHeaderCell>{t("email")}</TableHeaderCell>
              <TableHeaderCell>{t("phone")}</TableHeaderCell>
              <TableHeaderCell>{t("professionalType")}</TableHeaderCell>
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
                      aria-label={t("selectLead", { name: lead.full_name })}
                      className="h-4 w-4 accent-[var(--color-gold-primary)]"
                    />
                  </TableCell>
                  <TableCell label={t("name")} className="max-w-[180px] truncate font-semibold">
                    {lead.full_name}
                  </TableCell>
                  <TableCell label={t("company")} className="max-w-[160px] truncate">
                    {lead.company_name ?? "—"}
                  </TableCell>
                  <TableCell label={t("email")} className="max-w-[220px]">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span className="sm:hidden">
                        <MailIcon />
                      </span>
                      <bdi dir="ltr" className="hidden truncate text-text sm:inline">
                        {lead.email}
                      </bdi>
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(lead)}
                        title={copiedEmailId === lead.id ? t("emailCopied") : t("copyEmail")}
                        aria-label={copiedEmailId === lead.id ? t("emailCopied") : t("copyEmail")}
                        className="shrink-0 rounded-md p-1.5 hover:bg-surface-muted hover:text-gold-primary"
                      >
                        {copiedEmailId === lead.id ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell label={t("phone")}>
                    {lead.phone ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://wa.me/${toWhatsAppDigits(lead.whatsapp ?? lead.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("openWhatsapp")}
                          aria-label={t("openWhatsapp")}
                          className="rounded-md p-1.5 text-text-muted hover:bg-[#25D366]/15 hover:text-[#25D366]"
                        >
                          <WhatsAppIcon />
                        </a>
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
                  <TableCell label={t("professionalType")}>
                    {professionalTypeT(lead.professional_type)}
                  </TableCell>
                  <TableCell label={t("status")}>
                    <CommercialLeadStatusBadge status={lead.status} />
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
