import { api } from "@/lib/api";
import type { FinanceFilters, FinanceOptions, FinanceReport, FinancialEntryValues } from "@/types/finance";

export function getFinanceReport(filters: FinanceFilters, page: number): Promise<FinanceReport> {
  const query = new URLSearchParams({ from: filters.from, to: filters.to, page: String(page) });
  if (filters.kind) query.set("kind", filters.kind);
  if (filters.property_id) query.set("property_id", filters.property_id);
  if (filters.commercial_id) query.set("commercial_id", filters.commercial_id);
  return api.get(`/api/v1/finance/dashboard?${query}`);
}
export function getFinanceOptions(search = ""): Promise<FinanceOptions> {
  return api.get(`/api/v1/finance/options?${new URLSearchParams({ search })}`);
}
export function saveFinancialEntry(values: FinancialEntryValues, id?: number) {
  return id ? api.put(`/api/v1/finance/entries/${id}`, values) : api.post("/api/v1/finance/entries", values);
}
export function deleteFinancialEntry(id: number) {
  return api.delete(`/api/v1/finance/entries/${id}`);
}
