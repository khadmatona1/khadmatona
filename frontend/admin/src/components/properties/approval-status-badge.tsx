import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PropertyApprovalStatus } from "@/types/property";

const TONE: Record<PropertyApprovalStatus, "warning" | "success" | "error"> = {
  pending_approval: "warning",
  approved: "success",
  rejected: "error",
};

export function PropertyApprovalStatusBadge({ status }: { status: PropertyApprovalStatus }) {
  const t = useTranslations("PropertyApprovalStatus");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
