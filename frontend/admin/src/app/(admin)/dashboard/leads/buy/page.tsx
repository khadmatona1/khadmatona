"use client";

import { useTranslations } from "next-intl";
import { LeadsList } from "@/components/leads/leads-list";

export default function BuyLeadsPage() {
  const t = useTranslations("DashboardLeads");
  return <LeadsList type="buy_request" title={t("buyTitle")} subtitle={t("buySubtitle")} />;
}
