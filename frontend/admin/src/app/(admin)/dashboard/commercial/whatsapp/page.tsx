"use client";

import { useTranslations } from "next-intl";
import { WhatsAppInbox } from "@/components/whatsapp/whatsapp-inbox";

export default function CommercialWhatsAppPage() {
  const t = useTranslations("DashboardWhatsApp");

  return <WhatsAppInbox title={t("commercialTitle")} subtitle={t("commercialSubtitle")} />;
}
