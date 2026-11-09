import { api } from "@/lib/api";
import type { ReviewsSummary } from "@/types/reviews";

export function getReviews(): Promise<ReviewsSummary | null> {
  return api.get<ReviewsSummary | null>("/api/v1/reviews");
}
