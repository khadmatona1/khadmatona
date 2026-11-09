import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { PostStatus } from "@/types/blog";

const TONE: Record<PostStatus, "success" | "warning"> = {
  published: "success",
  draft: "warning",
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const t = useTranslations("PostStatus");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
