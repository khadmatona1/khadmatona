"use client";

import { useTranslations } from "next-intl";
import { LeadsList } from "@/components/leads/leads-list";

export default function ContactLeadsPage() {
  const t = useTranslations("DashboardLeads");

  return <LeadsList type="contact" title={t("contactTitle")} subtitle={t("contactSubtitle")} />;
}
