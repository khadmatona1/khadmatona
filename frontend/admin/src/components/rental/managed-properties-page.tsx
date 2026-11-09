"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { modal } from "@/lib/modal";
import { deleteManagedProperty, listManagedProperties, reviewManagedProperty } from "@/lib/rental";
import { useAuth } from "@/lib/auth-context";
import { ManagedPropertyForm } from "@/components/rental/rental-forms";
import { IconButton } from "@/components/rental/reservations-page";
import { EmptyState, RentalShell, useRentalFormat } from "@/components/rental/rental-ui";
import { confirmThen, useRentalList } from "@/components/rental/use-rental-list";
import type { ManagedProperty } from "@/types/rental";

export function ManagedPropertiesPage() {
  const t = useTranslations("Rental");
  const approval = useTranslations("RentalApproval");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const needsApproval = !isAdmin && !user?.roles?.includes("SeniorCommercial");
  const format = useRentalFormat();
  const [page, setPage] = useState(1);
  const list = useRentalList(
    () => listManagedProperties({ page, perPage: 20, sort: "-created_at" }),
    JSON.stringify({ page }),
    t("genericError"),
  );
  const refresh = () => list.reload();
  const labels = { confirm: t("confirm"), cancel: t("cancel") };

  function openForm(existing?: ManagedProperty) {
    modal.custom({ content: <ManagedPropertyForm existing={existing} onSaved={refresh} /> });
  }

  return (
    <RentalShell
      title={t("properties.title")}
      subtitle={t("properties.subtitle")}
      action={
        <Button type="button" onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          {needsApproval ? approval("request") : t("properties.add")}
        </Button>
      }
    >
      {needsApproval && <p className="mb-4 rounded-lg border border-border bg-surface-muted p-3 text-sm text-text-muted">{approval("hint")}</p>}
      {list.isLoading && list.items.length === 0 ? (
        <TableSkeleton rows={4} columns={5} />
      ) : list.items.length === 0 ? (
        <EmptyState title={t("properties.empty")} body={t("properties.emptyBody")} />
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>{t("fields.property")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("fields.commissionRate")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("fields.cleaningFee")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.status")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("actions")}</TableHeaderCell>
          </TableHead>
          <TableBody>
            {list.items.map((managed) => (
              <TableRow key={managed.id}>
                <TableCell label={t("fields.property")} className="max-w-[280px] truncate font-semibold">
                  <Link href={isAdmin ? `/dashboard/properties/${managed.property_id}` : `/dashboard/commercial/properties`} className="hover:text-gold-primary hover:underline">
                    #{managed.property_id} {managed.property_title}
                  </Link>
                </TableCell>
                <TableCell label={t("fields.commissionRate")} className="text-end font-mono tabular-nums">{managed.commission_rate} %</TableCell>
                <TableCell label={t("fields.cleaningFee")} className="text-end font-mono tabular-nums">
                  {format.money(managed.cleaning_fee)}
                  <span className="block text-[0.72rem] text-text-muted">{t(`chargedTo.${managed.cleaning_charged_to}`)}</span>
                </TableCell>
                <TableCell label={t("fields.status")}>
                  <Badge tone={managed.approval_status === "pending" ? "warning" : managed.is_active ? "success" : "neutral"}>{managed.approval_status !== "approved" ? approval(managed.approval_status) : managed.is_active ? t("properties.active") : t("properties.inactive")}</Badge>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-1">
                    {isAdmin && managed.approval_status === "pending" && <>
                      <Button size="sm" onClick={() => confirmThen(approval("confirmApprove"), labels, () => reviewManagedProperty(managed.id, "approve"), refresh, t("genericError"))}>{approval("approve")}</Button>
                      <Button size="sm" variant="secondary" onClick={() => confirmThen(approval("confirmReject"), labels, () => reviewManagedProperty(managed.id, "reject"), refresh, t("genericError"))}>{approval("reject")}</Button>
                    </>}
                    <IconButton label={t("edit")} onClick={() => openForm(managed)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={t("properties.remove")}
                      danger
                      onClick={() => confirmThen(t("properties.confirmRemove", { title: managed.property_title ?? `#${managed.property_id}` }), labels, () => deleteManagedProperty(managed.id), refresh, t("genericError"))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {list.pagination && <Pagination pagination={list.pagination} onPageChange={setPage} />}
    </RentalShell>
  );
}
