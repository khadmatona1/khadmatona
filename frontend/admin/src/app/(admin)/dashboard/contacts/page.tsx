"use client";

import { useTranslations } from "next-intl";
import { ContactsList } from "@/components/contacts/contacts-list";

export default function ContactsPage() {
  const t = useTranslations("DashboardContacts");

  return <ContactsList title={t("title")} subtitle={t("subtitle")} />;
}
