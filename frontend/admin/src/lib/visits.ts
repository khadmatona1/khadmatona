import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type {
  Visit,
  VisitBookingPayload,
  VisitConfirmation,
  VisitReportOutcome,
} from "@/types/visit";

/** Public, unauthenticated - books a visit (creates a Lead + a Visit). */
export function createVisit(payload: VisitBookingPayload): Promise<VisitConfirmation> {
  const body: Record<string, unknown> = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    property_id: payload.propertyId,
    scheduled_at: payload.scheduledAt,
  };
  if (payload.message?.trim()) body.message = payload.message.trim();

  return api.post<VisitConfirmation>("/api/v1/visits", body);
}

// Admin-only endpoints below (auth:sanctum + role:Admin|Commercial|SeniorCommercial).

export interface ListVisitsParams {
  page?: number;
  perPage?: number;
  status?: string;
  commercialId?: number;
  propertyId?: number;
  from?: string;
  to?: string;
  sort?: string;
}

export interface VisitList {
  visits: Visit[];
  pagination: Pagination;
}

export async function listVisits(params: ListVisitsParams = {}): Promise<VisitList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 15));
  query.set("sort", params.sort ?? "scheduled_at");
  if (params.status) query.set("filter[status]", params.status);
  if (params.commercialId !== undefined) query.set("filter[commercial_id]", String(params.commercialId));
  if (params.propertyId !== undefined) query.set("filter[property_id]", String(params.propertyId));
  if (params.from) query.set("filter[from]", params.from);
  if (params.to) query.set("filter[to]", params.to);

  const envelope = await api.getWithMeta<Visit[]>(`/api/v1/visits?${query.toString()}`);

  return {
    visits: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 15,
      total: envelope.data.length,
    },
  };
}

export function getVisit(id: number | string): Promise<Visit> {
  return api.get<Visit>(`/api/v1/visits/${id}`);
}

export function assignVisit(id: number | string, commercialId: number | null): Promise<Visit> {
  return api.patch<Visit>(`/api/v1/visits/${id}/assign`, { commercial_id: commercialId });
}

export function rescheduleVisit(id: number | string, scheduledAt: string): Promise<Visit> {
  return api.patch<Visit>(`/api/v1/visits/${id}/reschedule`, { scheduled_at: scheduledAt });
}

export function reportVisit(
  id: number | string,
  outcome: VisitReportOutcome,
  report?: string,
): Promise<Visit> {
  return api.patch<Visit>(`/api/v1/visits/${id}/report`, { outcome, report });
}

export function cancelVisit(id: number | string): Promise<Visit> {
  return api.patch<Visit>(`/api/v1/visits/${id}/cancel`, {});
}
