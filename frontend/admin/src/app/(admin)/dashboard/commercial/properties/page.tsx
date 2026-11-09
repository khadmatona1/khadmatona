"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
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
import { CommercialPropertyCreateContent } from "@/components/properties/commercial-property-create-content";
import { PropertyDetailContent } from "@/components/properties/property-detail-content";
import { PropertyEditContent } from "@/components/properties/property-edit-content";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/ui/action-icons";
import { ApiError } from "@/lib/api";
import { deleteProperty, listDashboardProperties } from "@/lib/properties";
import { PROPERTY_APPROVAL_STATUSES, type DashboardProperty, type Pagination as PaginationData, type PropertyApprovalStatus } from "@/types/property";

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

type Tab = PropertyApprovalStatus | "all";

function MyPropertiesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("DashboardCommercialProperties");
  const propertyType = useTranslations("PropertyType");
  const approvalStatus = useTranslations("PropertyApprovalStatus");
  const [properties, setProperties] = useState<DashboardProperty[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listDashboardProperties({
          page,
          approvalStatus: tab === "all" ? undefined : tab,
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
  }, [page, tab]);

  function handleTabChange(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function handleCreate() {
    modal.custom({
      content: (
        <CommercialPropertyCreateContent
          onCreated={(created) => setProperties((current) => [created, ...current])}
        />
      ),
    });
  }

  // Lets the sidebar's "Add property" link (?new=1) open this same popup
  // instead of landing on an empty list - opened once, then the query
  // param is stripped so a refresh doesn't reopen it.
  const hasOpenedFromQuery = useRef(false);
  useEffect(() => {
    if (hasOpenedFromQuery.current) return;
    if (searchParams.get("new") !== "1") return;
    hasOpenedFromQuery.current = true;
    handleCreate();
    router.replace("/dashboard/commercial/properties");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only ever reacts to the initial query param, not to later state changes
  }, [searchParams]);

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

  const tabs: Tab[] = ["all", ...PROPERTY_APPROVAL_STATUSES];

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

      <div className="flex flex-wrap gap-2">
        {tabs.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleTabChange(value)}
            className={clsx(
              "rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === value
                ? "border-gold-primary bg-gold-primary/15 text-gold-secondary"
                : "border-border-strong text-text-muted hover:border-gold-primary hover:text-gold-primary",
            )}
          >
            {value === "all" ? t("allTab") : approvalStatus(value)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : properties.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">{t("noResultsTitle")}</h3>
          <p className="mt-2 text-sm text-text-muted">{t("noResultsEmpty")}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>{t("propertyTitle")}</TableHeaderCell>
              <TableHeaderCell>{t("type")}</TableHeaderCell>
              <TableHeaderCell>{t("city")}</TableHeaderCell>
              <TableHeaderCell>{t("approvalStatus")}</TableHeaderCell>
              <TableHeaderCell>{t("price")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell label={t("propertyTitle")} className="max-w-[240px] truncate font-semibold">
                    {property.title}
                  </TableCell>
                  <TableCell label={t("type")}>{propertyType(property.type)}</TableCell>
                  <TableCell label={t("city")}>{property.city_name}</TableCell>
                  <TableCell label={t("approvalStatus")}>
                    <div className="flex flex-col gap-1">
                      <PropertyApprovalStatusBadge status={property.approval_status} />
                      <PropertyStatusBadge status={property.status} />
                    </div>
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

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

export default function MyPropertiesPage() {
  return (
    <Suspense fallback={null}>
      <MyPropertiesPageContent />
    </Suspense>
  );
}
