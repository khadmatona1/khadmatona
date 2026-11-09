"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Briefcase, Building2, Home, Mail, MapPin, MessageCircle, MessageSquare, Phone, User } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { submitCommercialLead } from "@/lib/commercial-leads";
import { modal } from "@/lib/modal";
import { isValidPhoneNumber } from "@/lib/phone";
import { useFormAnalytics } from "@/lib/analytics/use-form-analytics";
import { PROFESSIONAL_TYPES, type CommercialLeadFormValues } from "@/types/commercial-lead";

const EMPTY_VALUES: CommercialLeadFormValues = {
  full_name: "",
  company_name: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "",
  address: "",
  position: "",
  professional_type: "",
  message: "",
};

export function CommercialLeadForm() {
  const t = useTranslations("CommercialLeadForm");
  const professionalType = useTranslations("ProfessionalType");
  const [values, setValues] = useState<CommercialLeadFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  // Observes the funnel only (field names, never values) - see useFormAnalytics.
  const analytics = useFormAnalytics("partner_application");

  function set<K extends keyof CommercialLeadFormValues>(
    key: K,
    value: CommercialLeadFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (!values.phone.trim()) {
      setFieldErrors({ phone: t("phoneRequired") });
      return;
    }
    if (!isValidPhoneNumber(values.phone)) {
      setFieldErrors({ phone: t("phoneInvalid") });
      return;
    }
    if (values.whatsapp.trim() && !isValidPhoneNumber(values.whatsapp)) {
      setFieldErrors({ whatsapp: t("phoneInvalid") });
      return;
    }
    if (!values.professional_type) {
      setFieldErrors({ professional_type: t("professionalTypeRequired") });
      return;
    }

    setIsSubmitting(true);

    try {
      await submitCommercialLead(values);
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
        {t("sentBody")}
      </Alert>
    );
  }

  return (
    <form {...analytics.formProps} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="full_name"
          label={t("fullName")}
          icon={<User className="h-4 w-4" />}
          required
          value={values.full_name}
          onChange={(event) => set("full_name", event.target.value)}
          error={fieldErrors.full_name}
        />
        <Field
          name="company_name"
          label={t("companyName")}
          icon={<Building2 className="h-4 w-4" />}
          value={values.company_name}
          onChange={(event) => set("company_name", event.target.value)}
          error={fieldErrors.company_name}
          hint={t("optional")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="email"
          label={t("email")}
          icon={<Mail className="h-4 w-4" />}
          type="email"
          value={values.email}
          onChange={(event) => set("email", event.target.value)}
          error={fieldErrors.email}
          hint={t("optional")}
        />
        <Field
          name="phone"
          label={t("phone")}
          icon={<Phone className="h-4 w-4" />}
          type="tel"
          dir="ltr"
          required
          value={values.phone}
          onChange={(event) => set("phone", event.target.value)}
          error={fieldErrors.phone}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="whatsapp"
          label={t("whatsapp")}
          icon={<MessageCircle className="h-4 w-4" />}
          type="tel"
          dir="ltr"
          value={values.whatsapp}
          onChange={(event) => set("whatsapp", event.target.value)}
          error={fieldErrors.whatsapp}
          hint={t("optional")}
        />
        <Field
          name="city"
          label={t("city")}
          icon={<MapPin className="h-4 w-4" />}
          value={values.city}
          onChange={(event) => set("city", event.target.value)}
          error={fieldErrors.city}
          hint={t("optional")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="address"
          label={t("address")}
          icon={<Home className="h-4 w-4" />}
          value={values.address}
          onChange={(event) => set("address", event.target.value)}
          error={fieldErrors.address}
          hint={t("optional")}
        />
        <Field
          name="position"
          label={t("position")}
          icon={<Briefcase className="h-4 w-4" />}
          value={values.position}
          onChange={(event) => set("position", event.target.value)}
          error={fieldErrors.position}
          hint={t("optional")}
        />
      </div>

      <Select
        name="professional_type"
        label={t("professionalType")}
        required
        value={values.professional_type}
        onChange={(event) =>
          set("professional_type", event.target.value as CommercialLeadFormValues["professional_type"])
        }
        error={fieldErrors.professional_type}
      >
        <option value="">{t("selectProfessionalType")}</option>
        {PROFESSIONAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {professionalType(type)}
          </option>
        ))}
      </Select>

      <Textarea
        name="message"
        label={t("message")}
        icon={<MessageSquare className="h-4 w-4" />}
        placeholder={t("messagePlaceholder")}
        value={values.message}
        onChange={(event) => set("message", event.target.value)}
        error={fieldErrors.message}
      />

      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
