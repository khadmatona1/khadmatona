"use client";

import { useTranslations } from "next-intl";
import { LeadsList } from "@/components/leads/leads-list";

export default function RentLeadsPage() {
  const t = useTranslations("DashboardLeads");

  return (
    <LeadsList type="rent_request" title={t("rentTitle")} subtitle={t("rentSubtitle")} />
  );
}
