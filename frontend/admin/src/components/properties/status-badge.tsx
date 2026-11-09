import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatus } from "@/types/property";

const TONE: Record<PropertyStatus, "success" | "warning" | "info" | "gold"> = {
  disponible: "success",
  reserve: "warning",
  vendu: "info",
  loue: "gold",
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const t = useTranslations("PropertyStatus");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
