"use client";

import { useTranslations } from "next-intl";
import { LeadsList } from "@/components/leads/leads-list";

export default function SellLeadsPage() {
  const t = useTranslations("DashboardLeads");

  return (
    <LeadsList type="sell_request" title={t("sellTitle")} subtitle={t("sellSubtitle")} />
  );
}
