import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { CommercialLeadStatus } from "@/types/commercial-lead";

const TONE: Record<CommercialLeadStatus, "gold" | "info" | "warning" | "success" | "error"> = {
  new: "gold",
  contacted: "info",
  qualified: "warning",
  partner: "success",
  rejected: "error",
};

export function CommercialLeadStatusBadge({ status }: { status: CommercialLeadStatus }) {
  const t = useTranslations("CommercialLeadStatus");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
