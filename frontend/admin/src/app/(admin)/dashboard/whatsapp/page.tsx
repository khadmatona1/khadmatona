"use client";

import { useTranslations } from "next-intl";
import { WhatsAppInbox } from "@/components/whatsapp/whatsapp-inbox";

export default function WhatsAppPage() {
  const t = useTranslations("DashboardWhatsApp");

  return <WhatsAppInbox title={t("title")} subtitle={t("subtitle")} />;
}
