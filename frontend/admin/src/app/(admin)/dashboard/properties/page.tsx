"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
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
import { PropertyStatusBadge } from "@/components/properties/status-badge";
import { PropertyApprovalStatusBadge } from "@/components/properties/approval-status-badge";
import {
  EMPTY_PROPERTY_FILTERS,
  PropertyFilters,
  type PropertyFiltersValue,
} from "@/components/properties/property-filters";
import { PropertyDetailContent } from "@/components/properties/property-detail-content";
import { PropertyEditContent } from "@/components/properties/property-edit-content";
import { PropertyCreateContent } from "@/components/properties/property-create-content";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/ui/action-icons";
import { ApiError } from "@/lib/api";
import { deleteProperty, listDashboardProperties } from "@/lib/properties";
import type { DashboardProperty, Pagination as PaginationData } from "@/types/property";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export default function PropertiesListPage() {
  const t = useTranslations("DashboardProperties");
  const propertyType = useTranslations("PropertyType");
  const [properties, setProperties] = useState<DashboardProperty[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PropertyFiltersValue>(EMPTY_PROPERTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.type !== "" ||
    filters.status !== "" ||
    filters.cityId !== "" ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.surfaceMin !== "" ||
    filters.surfaceMax !== "";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listDashboardProperties({
          page,
          search: filters.search || undefined,
          type: filters.type || undefined,
          status: filters.status || undefined,
          cityId: filters.cityId ? Number(filters.cityId) : undefined,
          priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
          priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
          surfaceMin: filters.surfaceMin ? Number(filters.surfaceMin) : undefined,
          surfaceMax: filters.surfaceMax ? Number(filters.surfaceMax) : undefined,
        });
        if (cancelled) return;
        setProperties(result.properties);
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
  }, [page, filters]);

  function handleApplyFilters(next: PropertyFiltersValue) {
    setFilters(next);
    setPage(1);
  }

  function handleCreate() {
    modal.custom({
      content: (
        <PropertyCreateContent
          onCreated={(created) => setProperties((current) => [created, ...current])}
        />
      ),
    });
  }

  function handlePropertyUpdated(updated: DashboardProperty) {
    setProperties((current) => current.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleView(property: DashboardProperty) {
    modal.custom({
      content: <PropertyDetailContent id={property.id} onUpdated={handlePropertyUpdated} />,
    });
  }

  function handleEdit(property: DashboardProperty) {
    modal.custom({
      content: <PropertyEditContent id={property.id} onUpdated={handlePropertyUpdated} />,
    });
  }

  function handleDelete(property: DashboardProperty) {
    modal.confirm({
      message: t("confirmDelete", { title: property.title }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(property.id);
        try {
          await deleteProperty(property.id);
          setProperties((current) => current.filter((p) => p.id !== property.id));
          modal.success(t("deleteSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleCreate}>
          {t("addProperty")}
        </Button>
      </div>

      <PropertyFilters initialValue={filters} onApply={handleApplyFilters} />

      {isLoading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : properties.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">
            {t("noResultsTitle")}
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            {hasActiveFilters ? t("noResultsWithSearch") : t("noResultsEmpty")}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>{t("title")}</TableHeaderCell>
              <TableHeaderCell>{t("type")}</TableHeaderCell>
              <TableHeaderCell>{t("city")}</TableHeaderCell>
              <TableHeaderCell>{t("status")}</TableHeaderCell>
              <TableHeaderCell>{t("approvalStatus")}</TableHeaderCell>
              <TableHeaderCell>{t("price")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell label={t("title")} className="max-w-[240px] truncate font-semibold">
                    {property.title}
                  </TableCell>
                  <TableCell label={t("type")}>{propertyType(property.type)}</TableCell>
                  <TableCell label={t("city")}>{property.city_name}</TableCell>
                  <TableCell label={t("status")}>
                    <PropertyStatusBadge status={property.status} />
                  </TableCell>
                  <TableCell label={t("approvalStatus")}>
                    <PropertyApprovalStatusBadge status={property.approval_status} />
                  </TableCell>
                  <TableCell label={t("price")} className="font-mono tabular-nums">
                    <bdi dir="ltr">{currencyFormatter.format(property.price)} DH</bdi>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-1">
                      <button
                        type="button"
                        onClick={() => handleView(property)}
                        title={t("view")}
                        aria-label={t("view")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(property)}
                        title={t("edit")}
                        aria-label={t("edit")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(property)}
                        disabled={deletingId === property.id}
                        title={deletingId === property.id ? t("deleting") : t("delete")}
                        aria-label={deletingId === property.id ? t("deleting") : t("delete")}
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

          {pagination && (
            <Pagination pagination={pagination} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
