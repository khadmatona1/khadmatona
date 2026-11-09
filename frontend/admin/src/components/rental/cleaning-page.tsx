"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { modal } from "@/lib/modal";
import { deleteCleaning, listCleanings, updateCleaning } from "@/lib/rental";
import { CleaningForm } from "@/components/rental/rental-forms";
import { IconButton } from "@/components/rental/reservations-page";
import { CleaningStatusBadge, EmptyState, RentalShell, businessToday, propertyLabel, useManagedProperties, useRentalFormat } from "@/components/rental/rental-ui";
import { confirmThen, useRentalList } from "@/components/rental/use-rental-list";
import { CLEANING_STATUSES, type Cleaning } from "@/types/rental";

export function CleaningPage() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const { items: managed } = useManagedProperties();
  const [page, setPage] = useState(1);
  // Default: what still needs doing.
  const [status, setStatus] = useState("pending");
  const [propertyId, setPropertyId] = useState("");

  const filters = { status, property_id: propertyId };
  const list = useRentalList(
    () => listCleanings({ page, perPage: 20, sort: status === "pending" ? "scheduled_for" : "-scheduled_for", filters }),
    JSON.stringify({ page, filters }),
    t("genericError"),
  );
  const refresh = () => list.reload();
  const today = businessToday();
  const labels = { confirm: t("confirm"), cancel: t("cancel") };

  function openForm(existing?: Cleaning) {
    modal.custom({ content: <CleaningForm existing={existing} onSaved={refresh} /> });
  }

  return (
    <RentalShell
      title={t("cleaning.title")}
      subtitle={t("cleaning.subtitle")}
      action={
        <Button type="button" onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          {t("cleaning.add")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <span className="mb-2 block text-sm font-bold text-text">{t("fields.property")}</span>
          <Combobox
            value={propertyId}
            onChange={(value) => {
              setPropertyId(value);
              setPage(1);
            }}
            options={managed.map((item) => ({ value: String(item.property_id), label: propertyLabel(item) }))}
            placeholder={t("allProperties")}
            ariaLabel={t("fields.property")}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            label={t("fields.status")}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("allStatuses")}</option>
            {CLEANING_STATUSES.map((value) => (
              <option key={value} value={value}>{t(`cleaningStatus.${value}`)}</option>
            ))}
          </Select>
        </div>
      </div>

      {list.isLoading && list.items.length === 0 ? (
        <TableSkeleton rows={5} columns={6} />
      ) : list.items.length === 0 ? (
        <EmptyState title={t("cleaning.empty")} body={t("cleaning.emptyBody")} />
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>{t("fields.scheduledFor")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.property")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.cleanerName")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("fields.cost")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.status")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("actions")}</TableHeaderCell>
          </TableHead>
          <TableBody>
            {list.items.map((cleaning) => {
              const overdue = cleaning.status === "pending" && cleaning.scheduled_for < today;
              return (
                <TableRow key={cleaning.id}>
                  <TableCell label={t("fields.scheduledFor")} className={overdue ? "font-semibold text-error" : undefined}>
                    {format.day(cleaning.scheduled_for)}
                    {overdue && <span className="block text-[0.72rem]">{t("cleaning.overdue")}</span>}
                    {cleaning.reservation_id && <span className="block text-[0.72rem] text-text-muted">{t("cleaning.afterCheckout")}</span>}
                  </TableCell>
                  <TableCell label={t("fields.property")} className="max-w-[240px] truncate">{propertyLabel(cleaning)}</TableCell>
                  <TableCell label={t("fields.cleanerName")}>{cleaning.cleaner_name ?? "—"}</TableCell>
                  <TableCell label={t("fields.cost")} className="text-end font-mono tabular-nums">
                    {format.money(cleaning.cost)}
                    <span className="block text-[0.72rem] text-text-muted">{t(`chargedTo.${cleaning.charged_to}`)}</span>
                  </TableCell>
                  <TableCell label={t("fields.status")}>
                    <CleaningStatusBadge status={cleaning.status} />
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex flex-wrap justify-end gap-1">
                      {cleaning.status === "pending" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => confirmThen(t("cleaning.confirmDone"), labels, () => updateCleaning(cleaning.id, { status: "done" }), refresh, t("genericError"))}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t("cleaning.markDone")}
                        </Button>
                      )}
                      <IconButton label={t("edit")} onClick={() => openForm(cleaning)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={t("delete")} danger onClick={() => confirmThen(t("cleaning.confirmDelete"), labels, () => deleteCleaning(cleaning.id), refresh, t("genericError"))}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {list.pagination && <Pagination pagination={list.pagination} onPageChange={setPage} />}
    </RentalShell>
  );
}
