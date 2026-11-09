"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogIn, LogOut, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { modal } from "@/lib/modal";
import { cancelReservation, deleteReservation, listReservations } from "@/lib/rental";
import { ReservationForm, ReservationStepForm } from "@/components/rental/rental-forms";
import { EmptyState, RentalShell, ReservationStatusBadge, propertyLabel, useManagedProperties, useRentalFormat } from "@/components/rental/rental-ui";
import { confirmThen, useRentalList } from "@/components/rental/use-rental-list";
import { RESERVATION_CHANNELS, RESERVATION_STATUSES, type Reservation } from "@/types/rental";
import { BookingRequestsPanel } from "@/components/rental/booking-requests-panel";

export function ReservationsPage() {
  const t = useTranslations("Rental");
  const format = useRentalFormat();
  const { items: managed } = useManagedProperties();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [period, setPeriod] = useState<DateRange | null>(null);

  const filters = { search, status, channel, property_id: propertyId, from: period?.from, to: period?.to };
  const list = useRentalList(
    () => listReservations({ page, perPage: 15, sort: "-check_in_date", filters }),
    JSON.stringify({ page, filters }),
    t("genericError"),
  );

  const refresh = () => list.reload();
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  function openForm(existing?: Reservation) {
    modal.custom({ content: <ReservationForm existing={existing} onSaved={refresh} /> });
  }

  function openStep(reservation: Reservation, step: "check_in" | "check_out") {
    modal.custom({ content: <ReservationStepForm reservation={reservation} step={step} onSaved={refresh} /> });
  }

  const labels = { confirm: t("confirm"), cancel: t("cancel") };

  return (
    <RentalShell
      title={t("reservations.title")}
      subtitle={t("reservations.subtitle")}
      action={
        <Button type="button" onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          {t("reservations.add")}
        </Button>
      }
    >
      <BookingRequestsPanel onConfirmed={refresh} />
      <div className="flex flex-wrap items-end gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            changeFilter(() => setSearch(String(data.get("q") ?? "").trim()));
          }}
          className="w-full max-w-xs"
        >
          <input
            name="q"
            type="search"
            defaultValue={search}
            placeholder={t("reservations.searchPlaceholder")}
            className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary"
          />
        </form>
        <div className="w-full sm:w-56">
          <span className="mb-2 block text-sm font-bold text-text">{t("fields.property")}</span>
          <Combobox
            value={propertyId}
            onChange={(value) => changeFilter(() => setPropertyId(value))}
            options={managed.map((item) => ({ value: String(item.property_id), label: propertyLabel(item) }))}
            placeholder={t("allProperties")}
            ariaLabel={t("fields.property")}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select label={t("fields.status")} value={status} onChange={(event) => changeFilter(() => setStatus(event.target.value))}>
            <option value="">{t("allStatuses")}</option>
            {RESERVATION_STATUSES.map((value) => (
              <option key={value} value={value}>{t(`reservationStatus.${value}`)}</option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select label={t("fields.channel")} value={channel} onChange={(event) => changeFilter(() => setChannel(event.target.value))}>
            <option value="">{t("allChannels")}</option>
            {RESERVATION_CHANNELS.map((value) => (
              <option key={value} value={value}>{t(`channel.${value}`)}</option>
            ))}
          </Select>
        </div>
        <DateRangePicker label={t("reservations.period")} value={period} onChange={(range) => changeFilter(() => setPeriod(range))} />
      </div>

      {list.isLoading && list.items.length === 0 ? (
        <TableSkeleton rows={6} columns={7} />
      ) : list.items.length === 0 ? (
        <EmptyState title={t("reservations.empty")} body={t("reservations.emptyBody")} />
      ) : (
        <Table>
          <TableHead>
            <TableHeaderCell>{t("fields.guestName")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.property")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.stayDates")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.channel")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("fields.totalAmount")}</TableHeaderCell>
            <TableHeaderCell>{t("fields.status")}</TableHeaderCell>
            <TableHeaderCell align="end">{t("actions")}</TableHeaderCell>
          </TableHead>
          <TableBody>
            {list.items.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell label={t("fields.guestName")} className="font-semibold">
                  {reservation.guest_name}
                  <span className="block text-[0.75rem] font-normal text-text-muted">{t("fields.guestsShort", { count: reservation.guests_count })}</span>
                </TableCell>
                <TableCell label={t("fields.property")} className="max-w-[220px] truncate">{propertyLabel(reservation)}</TableCell>
                <TableCell label={t("fields.stayDates")}>
                  <bdi>{format.day(reservation.check_in_date)}</bdi> – <bdi>{format.day(reservation.check_out_date)}</bdi>
                  <span className="block text-[0.75rem] text-text-muted">{t("fields.nightsCount", { count: reservation.nights })}</span>
                </TableCell>
                <TableCell label={t("fields.channel")}>{t(`channel.${reservation.channel}`)}</TableCell>
                <TableCell label={t("fields.totalAmount")} className="text-end font-mono tabular-nums">
                  {format.money(reservation.total_amount)}
                  {reservation.platform_fee > 0 && (
                    <span className="block text-[0.72rem] text-text-muted">{t("reservations.netShort", { amount: format.money(reservation.net_revenue) })}</span>
                  )}
                </TableCell>
                <TableCell label={t("fields.status")}>
                  <ReservationStatusBadge status={reservation.status} />
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex flex-wrap justify-end gap-1">
                    {reservation.status === "confirmed" && (
                      <Button type="button" size="sm" onClick={() => openStep(reservation, "check_in")}>
                        <LogIn className="h-4 w-4" />
                        {t("reservations.checkIn")}
                      </Button>
                    )}
                    {reservation.status === "checked_in" && (
                      <Button type="button" size="sm" onClick={() => openStep(reservation, "check_out")}>
                        <LogOut className="h-4 w-4" />
                        {t("reservations.checkOut")}
                      </Button>
                    )}
                    {reservation.status !== "cancelled" && (
                      <IconButton label={t("edit")} onClick={() => openForm(reservation)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                    )}
                    {reservation.status === "confirmed" && (
                      <IconButton
                        label={t("reservations.cancelStay")}
                        onClick={() => confirmThen(t("reservations.confirmCancel", { guest: reservation.guest_name }), labels, () => cancelReservation(reservation.id), refresh, t("genericError"))}
                      >
                        <XCircle className="h-4 w-4" />
                      </IconButton>
                    )}
                    <IconButton
                      label={t("delete")}
                      danger
                      onClick={() => confirmThen(t("reservations.confirmDelete", { guest: reservation.guest_name }), labels, () => deleteReservation(reservation.id), refresh, t("genericError"))}
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

export function IconButton({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        danger
          ? "rounded-sm p-2 text-text-muted hover:bg-error-surface hover:text-error"
          : "rounded-sm p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
      }
    >
      {children}
    </button>
  );
}
