"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/contacts/contact-form";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { getContact, updateContact } from "@/lib/contacts";
import type { Contact, ContactFormValues } from "@/types/contact";

export function ContactEditContent({
  id,
  onUpdated,
}: {
  id: number;
  onUpdated?: (contact: Contact) => void;
}) {
  const t = useTranslations("DashboardContacts");
  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getContact(id)
      .then((data) => {
        if (!cancelled) setContact(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404 ? t("notFound") : t("loadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [id]);

  async function handleSubmit(values: ContactFormValues) {
    const updated = await updateContact(id, values);
    onUpdated?.(updated);
    modal.success(t("editSuccess"));
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !contact) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-balance text-text">
          {t("editTitle")}
        </h2>
        <p className="mt-1 truncate text-sm text-text-muted">{contact.name}</p>
      </div>

      <ContactForm
        initialValues={{
          type: contact.type,
          name: contact.name,
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          whatsapp: contact.whatsapp ?? "",
          address: contact.address ?? "",
          notes: contact.notes ?? "",
        }}
        submitLabel={t("editSubmit")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
