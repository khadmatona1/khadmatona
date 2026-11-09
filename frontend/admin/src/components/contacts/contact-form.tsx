"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { CONTACT_TYPES, type ContactFormValues } from "@/types/contact";

const EMPTY_VALUES: ContactFormValues = {
  type: "buyer",
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  notes: "",
};

export function ContactForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: ContactFormValues;
  submitLabel: string;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}) {
  const t = useTranslations("ContactForm");
  const contactType = useTranslations("ContactType");
  const [values, setValues] = useState<ContactFormValues>(initialValues ?? EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(values);
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Select
        label={t("type")}
        required
        value={values.type}
        onChange={(event) => set("type", event.target.value as ContactFormValues["type"])}
        error={fieldErrors.type}
      >
        {CONTACT_TYPES.map((type) => (
          <option key={type} value={type}>
            {contactType(type)}
          </option>
        ))}
      </Select>

      <Field
        label={t("name")}
        required
        value={values.name}
        onChange={(event) => set("name", event.target.value)}
        error={fieldErrors.name}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label={t("email")}
          type="email"
          dir="ltr"
          value={values.email}
          onChange={(event) => set("email", event.target.value)}
          error={fieldErrors.email}
        />
        <Field
          label={t("phone")}
          dir="ltr"
          value={values.phone}
          onChange={(event) => set("phone", event.target.value)}
          error={fieldErrors.phone}
        />
      </div>

      <Field
        label={t("whatsapp")}
        dir="ltr"
        hint={t("whatsappHint")}
        value={values.whatsapp}
        onChange={(event) => set("whatsapp", event.target.value)}
        error={fieldErrors.whatsapp}
      />

      <Textarea
        label={t("address")}
        value={values.address}
        onChange={(event) => set("address", event.target.value)}
        error={fieldErrors.address}
      />

      <Textarea
        label={t("notes")}
        value={values.notes}
        onChange={(event) => set("notes", event.target.value)}
        error={fieldErrors.notes}
      />

      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
