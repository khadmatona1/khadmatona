import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ContactType } from "@/types/contact";

const TONE: Record<ContactType, "info" | "gold" | "neutral" | "success"> = {
  buyer: "info",
  seller: "gold",
  tenant: "neutral",
  landlord: "success",
};

export function ContactTypeBadge({ type }: { type: ContactType }) {
  const t = useTranslations("ContactType");
  return <Badge tone={TONE[type]}>{t(type)}</Badge>;
}
