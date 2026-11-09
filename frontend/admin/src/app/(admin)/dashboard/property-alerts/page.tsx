"use client";

import { useTranslations } from "next-intl";
import { PropertyAlertsList } from "@/components/property-alerts/property-alerts-list";

export default function PropertyAlertsPage() {
  const t = useTranslations("DashboardPropertyAlerts");

  return <PropertyAlertsList title={t("title")} subtitle={t("subtitle")} />;
}
