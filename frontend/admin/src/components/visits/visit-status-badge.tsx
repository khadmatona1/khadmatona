import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { VisitStatus } from "@/types/visit";

const TONE: Record<VisitStatus, "gold" | "success" | "neutral" | "error"> = {
  scheduled: "gold",
  completed: "success",
  cancelled: "neutral",
  no_show: "error",
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const t = useTranslations("VisitStatus");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
