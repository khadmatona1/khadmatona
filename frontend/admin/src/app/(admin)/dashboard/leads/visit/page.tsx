"use client";

import { useTranslations } from "next-intl";
import { LeadsList } from "@/components/leads/leads-list";

export default function VisitLeadsPage() {
  const t = useTranslations("DashboardLeads");

  return (
    <LeadsList type="visit_request" title={t("visitTitle")} subtitle={t("visitSubtitle")} />
  );
}
