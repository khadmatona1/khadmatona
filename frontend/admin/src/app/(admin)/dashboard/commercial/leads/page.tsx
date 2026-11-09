"use client";

import { useTranslations } from "next-intl";
import { LeadsList } from "@/components/leads/leads-list";

export default function MyLeadsPage() {
  const t = useTranslations("DashboardMyLeads");

  return <LeadsList title={t("title")} subtitle={t("subtitle")} />;
}
