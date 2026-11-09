import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type {
  PropertyAlert,
  PropertyAlertConfirmation,
  PropertyAlertPayload,
} from "@/types/property-alert";

/**
 * Public, unauthenticated - saves a search as an alert. Only `phone` is
 * required (delivery is WhatsApp-only for now); every other field is only
 * sent when actually set, same convention as submitLead().
 */
export async function createPropertyAlert(
  payload: PropertyAlertPayload,
): Promise<PropertyAlertConfirmation> {
  const body: Record<string, unknown> = { phone: payload.phone.trim() };
  if (payload.transactionType) body.transaction_type = payload.transactionType;
  if (payload.pricePeriod) body.price_period = payload.pricePeriod;
  if (payload.email?.trim()) body.email = payload.email.trim();
  if (payload.cityId !== undefined) body.city_id = payload.cityId;
  if (payload.districtId !== undefined) body.district_id = payload.districtId;
  if (payload.propertyType) body.property_type = payload.propertyType;
  if (payload.budgetMax !== undefined) body.budget_max = payload.budgetMax;
  if (payload.surfaceMin !== undefined) body.surface_min = payload.surfaceMin;
  if (payload.surfaceMax !== undefined) body.surface_max = payload.surfaceMax;

  const envelope = await api.postWithMeta<PropertyAlertConfirmation>(
    "/api/v1/property-alerts",
    body,
  );

  return {
    id: envelope.data.id,
    alreadyExisted: Boolean(envelope.meta?.already_existed),
  };
}

// Admin-only endpoints below (auth:sanctum + role:Admin).

export interface ListPropertyAlertsParams {
  page?: number;
  perPage?: number;
  email?: string;
  phone?: string;
  cityId?: number;
  sort?: string;
}

export interface PropertyAlertList {
  alerts: PropertyAlert[];
  pagination: Pagination;
}

export async function listPropertyAlerts(
  params: ListPropertyAlertsParams = {},
): Promise<PropertyAlertList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 15));
  query.set("sort", params.sort ?? "-created_at");
  if (params.email) query.set("filter[email]", params.email);
  if (params.phone) query.set("filter[phone]", params.phone);
  if (params.cityId !== undefined)
    query.set("filter[city_id]", String(params.cityId));

  const envelope = await api.getWithMeta<PropertyAlert[]>(
    `/api/v1/property-alerts?${query.toString()}`,
  );

  return {
    alerts: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 15,
      total: envelope.data.length,
    },
  };
}

export function deletePropertyAlert(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/property-alerts/${id}`);
}
