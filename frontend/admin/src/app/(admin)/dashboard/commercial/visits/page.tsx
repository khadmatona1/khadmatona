"use client";

import { useTranslations } from "next-intl";
import { VisitsCalendar } from "@/components/visits/visits-calendar";

export default function MyVisitsPage() {
  const t = useTranslations("DashboardMyVisits");

  return <VisitsCalendar title={t("title")} subtitle={t("subtitle")} />;
}
