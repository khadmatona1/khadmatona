"use client";

import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/contacts/contact-form";
import { modal } from "@/lib/modal";
import { createContact } from "@/lib/contacts";
import type { Contact, ContactFormValues } from "@/types/contact";

export function ContactCreateContent({
  onCreated,
}: {
  onCreated?: (contact: Contact) => void;
}) {
  const t = useTranslations("DashboardContacts");

  async function handleSubmit(values: ContactFormValues) {
    const contact = await createContact(values);
    onCreated?.(contact);
    modal.success(t("createSuccess"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("newTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <ContactForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
    </div>
  );
}
