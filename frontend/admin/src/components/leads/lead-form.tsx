"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Mail, MessageSquare, Phone, User } from "lucide-react";
import { PropertyRequestWizard } from "@/components/leads/property-request-wizard";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { submitLead } from "@/lib/leads";
import { useFormAnalytics } from "@/lib/analytics/use-form-analytics";
import { isValidPhoneNumber } from "@/lib/phone";
import type { LeadType } from "@/types/lead";

export function LeadForm({
  type,
  propertyId,
  submitLabel,
  submitIcon,
  submitClassName,
  messagePlaceholder,
  showMessage = true,
  phoneRequired = false,
  variant = "default",
  dynamicPropertyFields = false,
}: {
  type: LeadType;
  propertyId?: number;
  submitLabel?: string;
  submitIcon?: ReactNode;
  submitClassName?: string;
  messagePlaceholder?: string;
  showMessage?: boolean;
  /** The backend accepts phone as optional for every lead type - this only
   * adds a stricter client-side requirement for flows (like rental
   * requests) where reaching the person quickly matters more. */
  phoneRequired?: boolean;
  /** "onDark" is for fixed-dark cards (e.g. the homepage's sell/rent form) -
   * threads through to every Field/Textarea/Select's own "onDark" variant. */
  variant?: "default" | "onDark";
  /** Renders the full 5-step Property Type / Details / Location / Contact /
   * Review wizard (see PropertyRequestWizard) instead of the plain single
   * form below - only meaningful for the sell/rent request flow, so only
   * SellRentSection sets this. */
  dynamicPropertyFields?: boolean;
}) {
  if (dynamicPropertyFields) {
    return (
      <PropertyRequestWizard
        type={type}
        submitLabel={submitLabel}
        submitIcon={submitIcon}
        submitClassName={submitClassName}
        messagePlaceholder={messagePlaceholder}
        showMessage={showMessage}
        phoneRequired={phoneRequired}
        variant={variant}
      />
    );
  }

  return (
    <SimpleLeadForm
      type={type}
      propertyId={propertyId}
      submitLabel={submitLabel}
      submitIcon={submitIcon}
      submitClassName={submitClassName}
      messagePlaceholder={messagePlaceholder}
      showMessage={showMessage}
      phoneRequired={phoneRequired}
      variant={variant}
    />
  );
}

function SimpleLeadForm({
  type,
  propertyId,
  submitLabel,
  submitIcon,
  submitClassName,
  messagePlaceholder,
  showMessage = true,
  phoneRequired = false,
  variant = "default",
}: {
  type: LeadType;
  propertyId?: number;
  submitLabel?: string;
  submitIcon?: ReactNode;
  submitClassName?: string;
  messagePlaceholder?: string;
  showMessage?: boolean;
  phoneRequired?: boolean;
  variant?: "default" | "onDark";
}) {
  const t = useTranslations("Leads");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  // Observes the funnel only (field names, never values) - see useFormAnalytics.
  const analytics = useFormAnalytics(type, { propertyId });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (phone.trim() && !isValidPhoneNumber(phone)) {
      setFieldErrors({ phone: t("phoneInvalid") });
      return;
    }

    setIsSubmitting(true);

    try {
      await submitLead({ type, name, email, phone, message, property_id: propertyId });
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
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
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
    <form {...analytics.formProps} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        name="name"
        label={t("fullName")}
        icon={<User className="h-4 w-4" />}
        variant={variant}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="email"
          label={t("email")}
          icon={<Mail className="h-4 w-4" />}
          variant={variant}
          type="email"
          hint={t("optional")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <Field
          name="phone"
          label={t("phone")}
          icon={<Phone className="h-4 w-4" />}
          variant={variant}
          type="tel"
          placeholder={t("phonePlaceholder")}
          dir="ltr"
          required={phoneRequired || !email.trim()}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.phone}
          hint={phoneRequired || !email.trim() ? undefined : t("optional")}
        />
      </div>
      {showMessage && (
        <Textarea
          name="message"
          label={t("message")}
          icon={<MessageSquare className="h-4 w-4" />}
          variant={variant}
          placeholder={messagePlaceholder ?? t("messagePlaceholder")}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          error={fieldErrors.message}
        />
      )}

      <Button type="submit" isLoading={isSubmitting} className={submitClassName ?? "self-start"}>
        {submitLabel ?? t("send")}
        {submitIcon}
      </Button>
    </form>
  );
}
