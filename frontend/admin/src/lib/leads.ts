import { api } from "@/lib/api";
import type { Lead, LeadFormValues, LeadStatus, LeadType } from "@/types/lead";
import type { Pagination } from "@/types/property";

export interface LeadConfirmation {
  id: number;
  type: string;
  name: string;
  created_at: string;
}

export function submitLead(values: LeadFormValues): Promise<LeadConfirmation> {
  // Optional fields are only sent when actually filled in - an empty
  // string would otherwise fail the backend's `nullable` + format rules
  // (e.g. the phone regex), since "present but empty" isn't the same as
  // "absent" for Laravel's validator.
  const payload: Record<string, unknown> = {
    type: values.type,
    name: values.name,
    email: values.email,
  };
  if (values.phone.trim()) payload.phone = values.phone.trim();
  if (values.message.trim()) payload.message = values.message.trim();
  if (values.property_id !== undefined) payload.property_id = values.property_id;
  if (values.property_type) payload.property_type = values.property_type;
  if (values.city?.trim()) payload.city = values.city.trim();
  if (values.district?.trim()) payload.district = values.district.trim();
  if (values.address?.trim()) payload.address = values.address.trim();
  if (values.property_details && Object.keys(values.property_details).length > 0) {
    payload.property_details = values.property_details;
  }

  return api.post<LeadConfirmation>("/api/v1/leads", payload);
}

// Admin-only endpoints below (auth:sanctum + role:Admin) - distinct from
// the public submitLead() above.

export interface ListLeadsParams {
  type?: LeadType;
  page?: number;
  perPage?: number;
  search?: string;
  status?: LeadStatus;
  sort?: string;
  commercialId?: number | string;
  propertyId?: number | string;
  contactId?: number | string;
  /** "YYYY-MM-DD", inclusive, in Morocco time (the backend's day boundaries). */
  createdFrom?: string;
  /** "YYYY-MM-DD", inclusive, in Morocco time. */
  createdTo?: string;
}

export interface LeadList {
  leads: Lead[];
  pagination: Pagination;
}

export async function listLeads(params: ListLeadsParams = {}): Promise<LeadList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  query.set("sort", params.sort ?? "-created_at");
  if (params.type) query.set("filter[type]", params.type);
  if (params.status) query.set("filter[status]", params.status);
  if (params.search) query.set("filter[search]", params.search);
  if (params.commercialId !== undefined) query.set("filter[commercial_id]", String(params.commercialId));
  if (params.propertyId !== undefined) query.set("filter[property_id]", String(params.propertyId));
  if (params.contactId !== undefined) query.set("filter[contact_id]", String(params.contactId));
  if (params.createdFrom) query.set("filter[created_from]", params.createdFrom);
  if (params.createdTo) query.set("filter[created_to]", params.createdTo);

  const envelope = await api.getWithMeta<Lead[]>(`/api/v1/leads?${query.toString()}`);

  return {
    leads: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 10,
      total: envelope.data.length,
    },
  };
}

export function getLead(id: number | string): Promise<Lead> {
  return api.get<Lead>(`/api/v1/leads/${id}`);
}

/** `callbackAt` (ISO string) is required by the API when status is "to_call_back". */
export function updateLeadStatus(id: number | string, status: LeadStatus, callbackAt?: string): Promise<Lead> {
  return api.patch<Lead>(`/api/v1/leads/${id}`, { status, ...(callbackAt ? { callback_at: callbackAt } : {}) });
}

export function deleteLead(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/leads/${id}`);
}

/** Links (or unlinks, with `contactId: null`) a lead to a Contact. */
export function linkLeadContact(id: number | string, contactId: number | null): Promise<Lead> {
  return api.patch<Lead>(`/api/v1/leads/${id}/contact`, { contact_id: contactId });
}
