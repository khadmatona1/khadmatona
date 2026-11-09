"use client";

import { useTranslations } from "next-intl";
import { ContactsList } from "@/components/contacts/contacts-list";

export default function CommercialContactsPage() {
  const t = useTranslations("DashboardContacts");

  return <ContactsList title={t("commercialTitle")} subtitle={t("commercialSubtitle")} />;
}
