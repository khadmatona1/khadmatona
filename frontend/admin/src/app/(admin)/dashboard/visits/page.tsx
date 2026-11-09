"use client";

import { useTranslations } from "next-intl";
import { VisitsCalendar } from "@/components/visits/visits-calendar";

export default function VisitsPage() {
  const t = useTranslations("DashboardVisits");

  return <VisitsCalendar title={t("title")} subtitle={t("subtitle")} />;
}
