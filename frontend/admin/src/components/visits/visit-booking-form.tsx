"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Mail, Phone, User as UserIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { modal } from "@/lib/modal";
import { ApiError } from "@/lib/api";
import { createVisit } from "@/lib/visits";
import { isValidPhoneNumber } from "@/lib/phone";
import { moroccoDateTimeFormatter } from "@/lib/morocco-time";
import { VisitSchedulerContent } from "@/components/visits/visit-scheduler-content";
import { useFormAnalytics } from "@/lib/analytics/use-form-analytics";

/**
 * "Réserver une visite" - the public property detail page's booking form,
 * replacing the generic LeadForm(type="visit_request") that previously sat
 * there. Mirrors SimpleLeadForm/PropertyAlertForm's shape (local state,
 * ApiError.errors -> field errors, inline success <Alert>, modal.error for
 * generic failures) but phone is required (the only WhatsApp delivery
 * channel) and a date/time is mandatory before submitting.
 */
export function VisitBookingForm({ propertyId }: { propertyId: number }) {
  const t = useTranslations("VisitBooking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  // Observes the funnel only (field names, never values) - see useFormAnalytics.
  const analytics = useFormAnalytics("visit_request", { propertyId });

  function openScheduler() {
    modal.custom({
      content: (
        <VisitSchedulerContent
          initialValue={scheduledAt}
          onConfirm={(iso) => {
            setScheduledAt(iso);
            setFieldErrors((current) => ({ ...current, scheduled_at: "" }));
          }}
        />
      ),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (phone.trim() && !isValidPhoneNumber(phone)) {
      setFieldErrors({ phone: t("phoneInvalid") });
      return;
    }
    if (!scheduledAt) {
      setFieldErrors({ scheduled_at: t("scheduledAtRequired") });
      return;
    }

    setIsSubmitting(true);
    try {
      await createVisit({
        name,
        email,
        phone,
        propertyId,
        scheduledAt,
        message,
      });
      analytics.trackSubmitted();
      setSent(true);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        const flattened: Record<string, string> = {};
        for (const [field, messages] of Object.entries(caught.errors)) {
          flattened[field] = messages[0];
        }
        setFieldErrors(flattened);
      } else {
        modal.error(
          caught instanceof ApiError ? caught.message : t("genericError"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Alert tone="success" title={t("sentTitle")}>
        {t("sentBody", { name: name.split(" ")[0] })}
      </Alert>
    );
  }

  return (
    <form
      {...analytics.formProps}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      <Field
        name="name"
        label={t("fullName")}
        icon={<UserIcon className="h-4 w-4" />}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
      />
      <div className="grid grid-cols-1 gap-4">
        <Field
          name="email"
          label={t("email")}
          icon={<Mail className="h-4 w-4" />}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <Field
          name="phone"
          label={t("phone")}
          icon={<Phone className="h-4 w-4" />}
          type="tel"
          placeholder={t("phonePlaceholder")}
          dir="ltr"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.phone}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-text">{t("scheduledAt")}</span>
        <button
          type="button"
          data-analytics-field="scheduled_at"
          onClick={openScheduler}
          className="w-full rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-start text-[0.95rem] text-text hover:border-gold-primary"
        >
          {scheduledAt ? (
            <bdi dir="ltr">
              {moroccoDateTimeFormatter.format(new Date(scheduledAt))}
            </bdi>
          ) : (
            <span className="text-text-muted">{t("choosDateTime")}</span>
          )}
        </button>
        {fieldErrors.scheduled_at && (
          <p className="text-[0.76rem] font-semibold text-error">
            {fieldErrors.scheduled_at}
          </p>
        )}
      </div>

      <Textarea
        name="message"
        label={t("message")}
        placeholder={t("messagePlaceholder")}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        error={fieldErrors.message}
      />

      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
