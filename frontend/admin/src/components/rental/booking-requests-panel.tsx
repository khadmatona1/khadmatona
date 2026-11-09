"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { confirmBookingRequest, listBookingRequests, rejectBookingRequest } from "@/lib/booking";
import type { BookingRequest } from "@/types/booking";
import type { Pagination as PageInfo } from "@/types/property";
import { useRentalFormat } from "./rental-ui";
import { confirmThen } from "./use-rental-list";

function ConfirmBookingForm({ booking, onSaved }: { booking: BookingRequest; onSaved: () => void }) {
  const t = useTranslations("Booking");
  const format = useRentalFormat();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const total = String(new FormData(event.currentTarget).get("total_amount") ?? "");
    submitting.current = true; setBusy(true); setError("");
    try { await confirmBookingRequest(booking.id, total); onSaved(); modal.close(); }
    catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? caught.message : t("actionError"));
    } finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <p className="font-semibold text-text">{booking.guest_name} · {booking.property_title}</p>
    <p className="text-sm text-text-muted">{format.day(booking.check_in_date)} — {format.day(booking.check_out_date)}</p>
    <p className="text-sm text-text-muted">{t("confirmHint")}</p>
    <Field name="total_amount" label={t("totalAmount")} type="number" min="0.01" max="100000000" step="0.01" required disabled={busy} />
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => modal.close()} disabled={busy}>{t("cancel")}</Button><Button type="submit" isLoading={busy}>{t("confirm")}</Button></div>
  </form>;
}

export function BookingRequestsPanel({ onConfirmed }: { onConfirmed: () => void }) {
  const t = useTranslations("Booking");
  const format = useRentalFormat();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify({ status, page, version });
  const [state, setState] = useState<{ key: string; items: BookingRequest[]; pagination: PageInfo | null; error: string }>({ key: "", items: [], pagination: null, error: "" });
  const loading = state.key !== key;
  useEffect(() => {
    let cancelled = false;
    const params = JSON.parse(key) as { page: number; status: string };
    listBookingRequests(params.page, params.status).then((result) => {
      if (!cancelled) setState({ key, ...result, error: "" });
    }).catch((error) => {
      if (!cancelled) setState({ key, items: [], pagination: null, error: error instanceof ApiError ? error.message : t("loadError") });
    });
    return () => { cancelled = true; };
  }, [key, t]);
  const refresh = () => { setPage(1); setVersion((v) => v + 1); };

  return <Card>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="font-display text-xl font-semibold text-text">{t("requestsTitle")}</h2><p className="mt-1 max-w-xl text-sm text-text-muted">{t("requestsHint")}</p></div>
      <div className="flex items-end gap-2"><Select label={t("status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("all")}</option>{(["pending", "confirmed", "rejected"] as const).map((value) => <option key={value} value={value}>{t(`statuses.${value}`)}</option>)}</Select><Button variant="secondary" onClick={refresh}>{t("refresh")}</Button></div>
    </div>
    {loading ? <Skeleton className="h-28" /> : state.error ? <p role="alert" className="text-error">{state.error}</p> : !state.items.length ? <p className="py-5 text-sm text-text-muted">{t("noRequests")}</p> : <div className="space-y-4">
      {state.items.map((booking) => <article key={booking.id} className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold text-text">{booking.property_title ?? `#${booking.property_id}`}</h3><p className="mt-1 text-sm text-text-muted">{booking.guest_name} · {t("guestsCount", { count: booking.guests_count })}</p></div><Badge tone={booking.status === "confirmed" ? "success" : booking.status === "rejected" ? "neutral" : "warning"}>{t(`statuses.${booking.status}`)}</Badge></div>
        <p className="mt-3 text-sm text-text"><bdi>{format.day(booking.check_in_date)}</bdi> — <bdi>{format.day(booking.check_out_date)}</bdi></p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-muted"><a className="underline" href={`tel:${booking.guest_phone}`} dir="ltr">{booking.guest_phone}</a><a className="break-all underline" href={`mailto:${booking.guest_email}`}>{booking.guest_email}</a></div>
        {booking.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-muted">{booking.notes}</p>}
        <p className="mt-3 break-all font-mono text-xs text-text-muted" dir="ltr">{booking.reference}</p>
        {booking.status === "pending" && <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => modal.custom({ title: t("confirmTitle"), content: <ConfirmBookingForm booking={booking} onSaved={() => { refresh(); onConfirmed(); }} /> })}>{t("confirm")}</Button><Button size="sm" variant="secondary" onClick={() => confirmThen(t("rejectConfirm"), { confirm: t("reject"), cancel: t("cancel") }, () => rejectBookingRequest(booking.id), refresh, t("actionError"))}>{t("reject")}</Button></div>}
        {booking.reservation_id && <p className="mt-3 text-sm text-text-muted">{t("reservationNumber", { id: booking.reservation_id })}</p>}
      </article>)}
    </div>}
    {!loading && state.pagination && state.pagination.last_page > 1 && <div className="mt-5"><Pagination pagination={state.pagination} onPageChange={setPage} /></div>}
  </Card>;
}
