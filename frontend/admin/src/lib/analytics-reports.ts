import { api } from "@/lib/api";
import type {
  AnalyticsEvents,
  AnalyticsFilters,
  AnalyticsForms,
  AnalyticsOverview,
  AnalyticsPages,
  AnalyticsProperties,
  AnalyticsSources,
  Journey,
  JourneyList,
  RealtimeVisitors,
} from "@/types/analytics";
import type { Pagination } from "@/types/property";

// Admin-only visitor analytics reports (auth:sanctum + role:Admin). The
// public tracker lives separately in lib/analytics/tracker.ts.

function toQuery(filters: AnalyticsFilters, extra: Record<string, string> = {}): string {
  const query = new URLSearchParams();
  query.set("range", filters.range);
  if (filters.range === "custom") {
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
  }
  if (filters.source) query.set("source", filters.source);
  if (filters.device) query.set("device", filters.device);
  if (filters.page) query.set("page", filters.page);
  if (filters.propertyId) query.set("property_id", filters.propertyId);
  if (filters.event) query.set("event", filters.event);
  if (filters.form) query.set("form", filters.form);
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  return query.toString();
}

export function getAnalyticsOverview(filters: AnalyticsFilters): Promise<AnalyticsOverview> {
  return api.get<AnalyticsOverview>(`/api/v1/analytics/overview?${toQuery(filters)}`);
}

export function getAnalyticsSources(filters: AnalyticsFilters): Promise<AnalyticsSources> {
  return api.get<AnalyticsSources>(`/api/v1/analytics/sources?${toQuery(filters)}`);
}

export function getAnalyticsPages(filters: AnalyticsFilters): Promise<AnalyticsPages> {
  return api.get<AnalyticsPages>(`/api/v1/analytics/pages?${toQuery(filters)}`);
}

export function getAnalyticsProperties(filters: AnalyticsFilters): Promise<AnalyticsProperties> {
  return api.get<AnalyticsProperties>(`/api/v1/analytics/properties?${toQuery(filters)}`);
}

export function getAnalyticsForms(filters: AnalyticsFilters): Promise<AnalyticsForms> {
  return api.get<AnalyticsForms>(`/api/v1/analytics/forms?${toQuery(filters)}`);
}

export function getAnalyticsEvents(filters: AnalyticsFilters): Promise<AnalyticsEvents> {
  return api.get<AnalyticsEvents>(`/api/v1/analytics/events?${toQuery(filters)}`);
}

export async function getAnalyticsJourneys(filters: AnalyticsFilters, page = 1, perPage = 10): Promise<JourneyList> {
  const envelope = await api.getWithMeta<Journey[]>(
    `/api/v1/analytics/journeys?${toQuery(filters, { page_number: String(page), per_page: String(perPage) })}`,
  );

  return {
    journeys: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: perPage,
      total: envelope.data.length,
    },
  };
}

export function getRealtimeVisitors(): Promise<RealtimeVisitors> {
  return api.get<RealtimeVisitors>("/api/v1/analytics/realtime");
}
