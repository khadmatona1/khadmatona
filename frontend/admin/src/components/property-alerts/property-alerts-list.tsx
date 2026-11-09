"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
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
import { TrashIcon } from "@/components/ui/action-icons";
import { ApiError } from "@/lib/api";
import { deletePropertyAlert, listPropertyAlerts } from "@/lib/property-alerts";
import type { PropertyAlert } from "@/types/property-alert";
import type { Pagination as PaginationData } from "@/types/property";

const budgetFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/**
 * Read-only visibility into saved searches for the business (no create/edit -
 * these only ever come from the public alert form) plus delete for
 * housekeeping. Mirrors ContactsList/LeadsList's table/pagination/
 * modal.confirm-delete shape.
 */
export function PropertyAlertsList({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useTranslations("DashboardPropertyAlerts");
  const propertyType = useTranslations("PropertyType");
  const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listPropertyAlerts({ page });
        if (cancelled) return;
        setAlerts(result.alerts);
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
  }, [page]);

  function handleDelete(alert: PropertyAlert) {
    modal.confirm({
      message: t("confirmDelete"),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(alert.id);
        try {
          await deletePropertyAlert(alert.id);
          setAlerts((current) => current.filter((a) => a.id !== alert.id));
          modal.success(t("deleteSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  function criteriaSummary(alert: PropertyAlert): string {
    const parts: string[] = [];
    if (alert.city_name) parts.push(alert.city_name);
    if (alert.property_type) parts.push(propertyType(alert.property_type));
    if (alert.budget_max !== null) parts.push(`≤ ${budgetFormatter.format(alert.budget_max)} DH`);
    if (alert.surface_min !== null || alert.surface_max !== null) {
      parts.push(`${alert.surface_min ?? 0}–${alert.surface_max ?? "∞"} m²`);
    }
    return parts.length > 0 ? parts.join(" · ") : t("anyProperty");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noResultsTitle")}</h3>
          <p className="mt-2 text-sm text-text-muted">{t("noResultsEmpty")}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>{t("phone")}</TableHeaderCell>
              <TableHeaderCell>{t("email")}</TableHeaderCell>
              <TableHeaderCell>{t("criteria")}</TableHeaderCell>
              <TableHeaderCell>{t("createdOn")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell label={t("phone")}>
                    <bdi dir="ltr">{alert.phone}</bdi>
                  </TableCell>
                  <TableCell label={t("email")} className="max-w-[220px] truncate">
                    <bdi dir="ltr">{alert.email ?? "—"}</bdi>
                  </TableCell>
                  <TableCell label={t("criteria")} className="max-w-[280px]">
                    {criteriaSummary(alert)}
                  </TableCell>
                  <TableCell label={t("createdOn")}>
                    {dateFormatter.format(new Date(alert.created_at))}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleDelete(alert)}
                      disabled={deletingId === alert.id}
                      title={deletingId === alert.id ? t("deleting") : t("delete")}
                      aria-label={deletingId === alert.id ? t("deleting") : t("delete")}
                      className="rounded-md p-2 text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                    >
                      <TrashIcon />
                    </button>
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
