import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type { OwnerMonthlyReportEntry, OwnerProperty } from "@/types/owner";

export interface OwnerPropertyList {
  properties: OwnerProperty[];
  pagination: Pagination;
}

export async function listOwnerProperties(page = 1): Promise<OwnerPropertyList> {
  const envelope = await api.getWithMeta<OwnerProperty[]>(`/api/v1/owner/properties?page=${page}`);

  return {
    properties: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: envelope.data.length,
    },
  };
}

export function getOwnerProperty(id: number | string): Promise<OwnerProperty> {
  return api.get<OwnerProperty>(`/api/v1/owner/properties/${id}`);
}

export async function getOwnerMonthlyReport(): Promise<OwnerMonthlyReportEntry[]> {
  const result = await api.get<{ months: OwnerMonthlyReportEntry[] }>("/api/v1/owner/reports/monthly");

  return result.months;
}
