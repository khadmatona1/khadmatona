"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Mail, Phone } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { modal } from "@/lib/modal";
import { ApiError } from "@/lib/api";
import { createPropertyAlert } from "@/lib/property-alerts";
import { isValidPhoneNumber } from "@/lib/phone";
import { useFormAnalytics } from "@/lib/analytics/use-form-analytics";
import type { PropertyFiltersValue } from "@/components/properties/property-filters";
import type { PropertyAlertPayload } from "@/types/property-alert";

/**
 * "Recevoir des alertes pour cette recherche" - collects a WhatsApp number
 * (required, the only delivery channel today) and an optional email, then
 * saves the current search as an alert. Mirrors SimpleLeadForm's shape
 * (components/leads/lead-form.tsx): local state, inline field errors from
 * ApiError.errors, modal.error() for generic failures, an inline success
 * <Alert> rather than a modal.
 */
export function PropertyAlertForm({
  filters,
  onDone,
}: {
  filters: PropertyFiltersValue;
  onDone: () => void;
}) {
  const t = useTranslations("PropertyAlerts");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ alreadyExisted: boolean } | null>(
    null,
  );
  // Observes the funnel only (field names, never values) - see useFormAnalytics.
  const analytics = useFormAnalytics("property_alert");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (!phone.trim()) {
      setFieldErrors({ phone: t("phoneRequired") });
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setFieldErrors({ phone: t("phoneInvalid") });
      return;
    }

    const payload: PropertyAlertPayload = { phone: phone.trim() };
    if (email.trim()) payload.email = email.trim();
    if (filters.transactionType)
      payload.transactionType = filters.transactionType;
    if (filters.pricePeriod) payload.pricePeriod = filters.pricePeriod;
    if (filters.cityId) payload.cityId = Number(filters.cityId);
    if (filters.type) payload.propertyType = filters.type;
    if (filters.priceMax) payload.budgetMax = Number(filters.priceMax);
    if (filters.surfaceMin) payload.surfaceMin = Number(filters.surfaceMin);
    if (filters.surfaceMax) payload.surfaceMax = Number(filters.surfaceMax);

    setIsSubmitting(true);
    try {
      const confirmation = await createPropertyAlert(payload);
      analytics.trackSubmitted();
      setResult({ alreadyExisted: confirmation.alreadyExisted });
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

  if (result) {
    return (
      <Alert
        tone="success"
        title={result.alreadyExisted ? t("alreadyExistsTitle") : t("sentTitle")}
      >
        {result.alreadyExisted ? t("alreadyExistsBody") : t("sentBody")}
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
      <div>
        <h3 className="font-display text-lg font-semibold text-text">
          {t("ctaTitle")}
        </h3>
        <p className="mt-1 text-sm text-text-muted">{t("formSubtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="phone"
          label={t("phone")}
          icon={<Phone className="h-4 w-4" />}
          type="tel"
          dir="ltr"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.phone}
        />
        <Field
          name="email"
          label={t("email")}
          icon={<Mail className="h-4 w-4" />}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          hint={t("optional")}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
