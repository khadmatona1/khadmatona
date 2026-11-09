"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { BookingDatePicker } from "@/components/rental/booking-date-picker";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { getBookingAvailability, submitBookingRequest } from "@/lib/booking";
import { businessToday } from "@/components/rental/rental-ui";

export function PublicBookingForm({
  propertyId,
  onEligibility,
}: {
  propertyId: number;
  onEligibility?: (bookable: boolean) => void;
}) {
  const t = useTranslations("Booking");
  const [version, setVersion] = useState(0);
  const [eligibility, setEligibility] = useState<{
    propertyId: number;
    bookable: boolean;
    error: string;
  } | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [availability, setAvailability] = useState<{
    key: string;
    available: boolean | null;
    error: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const submitting = useRef(false);
  const lastAttempt = useRef<{ payload: string; key: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [reference, setReference] = useState("");
  const successRef = useRef<HTMLDivElement>(null);
  const today = businessToday();
  const maxDate = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  const datesKey = `${propertyId}:${checkIn}:${checkOut}`;
  const validDates =
    !!checkIn && checkIn >= today && checkOut > checkIn && checkOut <= maxDate;
  const nights = validDates
    ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000)
    : 0;
  const checking = validDates && availability?.key !== datesKey;
  const available =
    availability?.key === datesKey && availability.available === true;

  useEffect(() => {
    let cancelled = false;
    getBookingAvailability(propertyId)
      .then((result) => {
        if (!cancelled) {
          setEligibility({ propertyId, bookable: result.bookable, error: "" });
          onEligibility?.(result.bookable);
        }
      })
      .catch((error) => {
        if (!cancelled)
          setEligibility({
            propertyId,
            bookable: false,
            error:
              error instanceof ApiError && error.status === 404
                ? ""
                : t("loadError"),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, version, t, onEligibility]);

  useEffect(() => {
    if (!validDates || !eligibility?.bookable) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getBookingAvailability(propertyId, checkIn, checkOut)
        .then((result) => {
          if (!cancelled)
            setAvailability({
              key: datesKey,
              available: result.available,
              error: "",
            });
        })
        .catch((error) => {
          if (!cancelled)
            setAvailability({
              key: datesKey,
              available: null,
              error: error instanceof ApiError ? error.message : t("loadError"),
            });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    propertyId,
    checkIn,
    checkOut,
    datesKey,
    validDates,
    eligibility?.bookable,
    version,
    t,
  ]);

  useEffect(() => {
    if (reference) successRef.current?.focus();
  }, [reference]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !validDates || !available) return;
    if (!showContact) {
      setShowContact(true);
      return;
    }
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const values = {
      property_id: propertyId,
      check_in_date: checkIn,
      check_out_date: checkOut,
      guest_name: value("guest_name"),
      guest_phone: value("guest_phone"),
      guest_email: value("guest_email"),
      guests_count: Number(value("guests_count")),
      notes: value("notes"),
      consent: form.has("consent"),
      website: value("website"),
    };
    const payload = JSON.stringify(values);
    if (lastAttempt.current?.payload !== payload)
      lastAttempt.current = { payload, key: crypto.randomUUID() };
    submitting.current = true;
    setBusy(true);
    setErrors({});
    setFailure("");
    try {
      const result = await submitBookingRequest({
        ...values,
        request_key: lastAttempt.current.key,
      });
      setReference(result.reference);
    } catch (error) {
      if (error instanceof ApiError)
        setErrors(
          Object.fromEntries(
            Object.entries(error.errors).map(([key, messages]) => [
              key,
              messages[0],
            ]),
          ),
        );
      setFailure(
        error instanceof ApiError && error.status === 429
          ? t("tooMany")
          : t("submitError"),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!eligibility || eligibility.propertyId !== propertyId)
    return <Skeleton className="h-32" />;
  if (eligibility.error)
    return (
      <Card>
        <p role="alert" className="text-sm text-text-muted">
          {eligibility.error}
        </p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => setVersion((v) => v + 1)}
        >
          {t("retry")}
        </Button>
      </Card>
    );
  if (!eligibility.bookable) return null;
  if (reference)
    return (
      <Card>
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="space-y-3 text-text"
        >
          <CheckCircle2 className="text-gold-primary" size={32} />
          <h2 className="font-display text-xl font-semibold">
            {t("received")}
          </h2>
          <p className="text-sm text-text-muted">{t("receivedHint")}</p>
          <p className="font-mono font-semibold" dir="ltr">
            {reference}
          </p>
        </div>
      </Card>
    );

  return (
    <Card className="booking-widget overflow-hidden !rounded-2xl border-border !p-6 shadow-lg">
      <div className="mb-5">
        <h2 className="text-[22px] font-semibold tracking-tight text-text underline underline-offset-4">
          {t("rateOnRequest")}
        </h2>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4"
        aria-busy={busy}
      >
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <div className="booking-stay-fields overflow-hidden rounded-xl border border-border-strong bg-surface">
            <BookingDatePicker
              checkIn={checkIn}
              checkOut={checkOut}
              min={today}
              max={maxDate}
              errors={errors}
              onChange={(from, to) => {
                setCheckIn(from);
                setCheckOut(to);
                setErrors({});
              }}
            />
            <div className="border-t border-border p-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide">{t("travelers")}</span>
                <select name="guests_count" defaultValue="1" required className="w-full !min-h-6 !rounded-none !border-0 bg-transparent !p-0 text-sm text-text">
                  {Array.from({ length: 50 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>{t("guestsCount", { count })}</option>
                  ))}
                </select>
              </label>
              {errors.guests_count && <p role="alert" className="mt-1 text-xs text-error">{errors.guests_count}</p>}
            </div>
          </div>

          <div aria-live="polite" className="rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
            {checkIn && checkOut && !validDates ? (
              t("invalidDates")
            ) : checking ? (
              t("checking")
            ) : validDates && availability?.key === datesKey ? (
              availability.error ? (
                <>
                  <p>{availability.error}</p>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => setVersion((v) => v + 1)}
                  >
                    {t("retry")}
                  </Button>
                </>
              ) : (
                <p>
                  {availability.available
                    ? t("available", { count: nights })
                    : t("unavailable")}
                </p>
              )
            ) : t("requestNotice")}
          </div>

          <fieldset disabled={!showContact} hidden={!showContact} className="min-w-0 space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-text">{t("contactDetails")}</h3>
              <button type="button" onClick={() => setShowContact(false)} className="text-sm text-text-muted underline underline-offset-4">{t("back")}</button>
            </div>
            <Field
              name="guest_name"
              autoComplete="name"
              required
              maxLength={255}
              label={t("name")}
              icon={<UserRound size={16} />}
              error={errors.guest_name}
            />
            <div className="grid gap-4">
              <Field
                name="guest_phone"
                type="tel"
                autoComplete="tel"
                dir="ltr"
                required
                maxLength={30}
                label={t("phone")}
                icon={<Phone size={16} />}
                error={errors.guest_phone}
              />
              <Field
                name="guest_email"
                type="email"
                autoComplete="email"
                dir="ltr"
                maxLength={255}
                label={t("optionalEmail")}
                icon={<Mail size={16} />}
                error={errors.guest_email}
              />
            </div>
            <details className="text-sm text-text-muted">
              <summary className="cursor-pointer">{t("notes")}</summary>
              <div className="mt-3">
                <Textarea
              name="notes"
              maxLength={2000}
              label={t("notes")}
              icon={<MessageSquare size={16} />}
              error={errors.notes}
                />
              </div>
            </details>
          <div className="hidden" aria-hidden="true">
            <label>
              {t("website")}
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-xs leading-relaxed text-text-muted">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 shrink-0 accent-gold-primary"
              aria-describedby={
                errors.consent ? "booking-consent-error" : undefined
              }
            />
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-gold-primary"
              aria-hidden="true"
            />
            <span>{t("consent")}</span>
          </label>
          {errors.consent && (
            <p id="booking-consent-error" className="text-sm text-error">
              {errors.consent}
            </p>
          )}
          </fieldset>
        </fieldset>
        {failure && (
          <p role="alert" className="text-sm text-error">
            {failure}
          </p>
        )}
        {!showContact ? (
          <Button type="button" size="lg" className="booking-reserve-button w-full" disabled={!available || !validDates || busy} onClick={() => setShowContact(true)}>
            {t("reserve")}
          </Button>
        ) : <Button
          type="submit"
          size="lg"
          className="booking-reserve-button w-full"
          isLoading={busy}
          disabled={!available || !validDates || busy}
        >
          {t("submit")}
        </Button>}
        <p className="text-center text-sm text-text-muted">
          {t("noCharge")}
        </p>
      </form>
    </Card>
  );
}
