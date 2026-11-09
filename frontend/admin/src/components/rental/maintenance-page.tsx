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
import { deleteMaintenance, listMaintenance, updateMaintenance } from "@/lib/rental";
import { MaintenanceForm } from "@/components/rental/rental-forms";
import { IconButton } from "@/components/rental/reservations-page";
import { EmptyState, MaintenanceStatusBadge, PriorityBadge, RentalShell, propertyLabel, useManagedProperties, useRentalFormat } from "@/components/rental/rental-ui";
import { confirmThen, useRentalList } from "@/components/rental/use-rental-list";
import { MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES, type MaintenanceRequest } from "@/types/rental";

export function MaintenancePage() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const { items: managed } = useManagedProperties();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const filters = { status, priority, property_id: propertyId };
  const list = useRentalList(
    () => listMaintenance({ page, perPage: 20, sort: "-reported_on", filters }),
    JSON.stringify({ page, filters }),
    t("genericError"),
  );
  const refresh = () => list.reload();
  const labels = { confirm: t("confirm"), cancel: t("cancel") };

  function openForm(existing?: MaintenanceRequest) {
    modal.custom({ content: <MaintenanceForm existing={existing} onSaved={refresh} /> });
  }

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <RentalShell
      title={t("maintenance.title")}
      subtitle={t("maintenance.subtitle")}
      action={
        <Button type="button" onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          {t("maintenance.add")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <span className="mb-2 block text-sm font-bold text-text">{t("fields.property")}</span>
          <Combobox
            value={propertyId}
            onChange={(value) => setFilter(() => setPropertyId(value))}
            options={managed.map((item) => ({ value: String(item.property_id), label: propertyLabel(item) }))}
            placeholder={t("allProperties")}
            ariaLabel={t("fields.property")}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select label={t("fields.status")} value={status} onChange={(event) => setFilter(() => setStatus(event.target.value))}>
            <option value="">{t("allStatuses")}</option>
            {MAINTENANCE_STATUSES.map((value) => (
              <option key={value} value={value}>{t(`maintenanceStatus.${value}`)}</option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select label={t("fields.priority")} value={priority} onChange={(event) => setFilter(() => setPriority(event.target.value))}>
            <option value="">{t("allPriorities")}</option>
            {MAINTENANCE_PRIORITIES.map((value) => (
              <option key={value} value={value}>{t(`priority.${value}`)}</option>
            ))}
          </Select>
        </div>
      </div>

      {list.isLoading && list.items.length === 0 ? (
        <TableSkeleton rows={5} columns={6} />
      ) : list.items.length === 0 ? (
        <EmptyState title={t("maintenance.empty")} body={t("maintenance.emptyBody")} />
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>{t("fields.issueTitle")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.property")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.priority")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.reportedOn")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("fields.cost")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.status")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("actions")}</TableHeaderCell>
          </TableHead>
          <TableBody>
            {list.items.map((request) => (
              <TableRow key={request.id}>
                <TableCell label={t("fields.issueTitle")} className="max-w-[260px] font-semibold">
                  {request.title}
                  {request.provider_name && <span className="block text-[0.75rem] font-normal text-text-muted">{request.provider_name}</span>}
                </TableCell>
                <TableCell label={t("fields.property")} className="max-w-[220px] truncate">{propertyLabel(request)}</TableCell>
                <TableCell label={t("fields.priority")}>
                  <PriorityBadge priority={request.priority} />
                </TableCell>
                <TableCell label={t("fields.reportedOn")}>{format.day(request.reported_on)}</TableCell>
                <TableCell label={t("fields.cost")} className="text-end font-mono tabular-nums">
                  {format.money(request.cost)}
                  <span className="block text-[0.72rem] text-text-muted">{t(`chargedTo.${request.charged_to}`)}</span>
                </TableCell>
                <TableCell label={t("fields.status")}>
                  <MaintenanceStatusBadge status={request.status} />
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-wrap justify-end gap-1">
                    {(request.status === "open" || request.status === "in_progress") && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => confirmThen(t("maintenance.confirmResolve"), labels, () => updateMaintenance(request.id, { status: "resolved" }), refresh, t("genericError"))}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t("maintenance.markResolved")}
                      </Button>
                    )}
                    <IconButton label={t("edit")} onClick={() => openForm(request)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={t("delete")} danger onClick={() => confirmThen(t("maintenance.confirmDelete"), labels, () => deleteMaintenance(request.id), refresh, t("genericError"))}>
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
