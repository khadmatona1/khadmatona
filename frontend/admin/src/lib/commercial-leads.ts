import { api } from "@/lib/api";
import type {
  CommercialLead,
  CommercialLeadFormValues,
  CommercialLeadStatus,
  ProfessionalType,
} from "@/types/commercial-lead";
import type { Pagination } from "@/types/property";

export interface CommercialLeadConfirmation {
  id: number;
  full_name: string;
  company_name: string | null;
  professional_type: string;
  created_at: string;
}

export function submitCommercialLead(
  values: CommercialLeadFormValues,
): Promise<CommercialLeadConfirmation> {
  // Optional fields are only sent when actually filled in - an empty string
  // would otherwise fail the backend's `nullable` + format rules (e.g. the
  // phone regex), since "present but empty" isn't the same as "absent" for
  // Laravel's validator. Same convention as submitLead() in lib/leads.ts.
  const payload: Record<string, unknown> = {
    full_name: values.full_name,
    email: values.email,
    professional_type: values.professional_type,
  };
  if (values.company_name.trim()) payload.company_name = values.company_name.trim();
  if (values.phone.trim()) payload.phone = values.phone.trim();
  if (values.whatsapp.trim()) payload.whatsapp = values.whatsapp.trim();
  if (values.city.trim()) payload.city = values.city.trim();
  if (values.address.trim()) payload.address = values.address.trim();
  if (values.position.trim()) payload.position = values.position.trim();
  if (values.message.trim()) payload.message = values.message.trim();

  return api.post<CommercialLeadConfirmation>("/api/v1/commercial-leads", payload);
}

// Admin-only endpoints below (auth:sanctum + role:Admin) - distinct from
// the public submitCommercialLead() above.

export interface ListCommercialLeadsParams {
  page?: number;
  perPage?: number;
  search?: string;
  professionalType?: ProfessionalType;
  status?: CommercialLeadStatus;
  city?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
}

export interface CommercialLeadList {
  leads: CommercialLead[];
  pagination: Pagination;
}

export async function listCommercialLeads(
  params: ListCommercialLeadsParams = {},
): Promise<CommercialLeadList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  query.set("sort", params.sort ?? "-created_at");
  if (params.professionalType) query.set("filter[professional_type]", params.professionalType);
  if (params.status) query.set("filter[status]", params.status);
  if (params.search) query.set("filter[search]", params.search);
  if (params.city) query.set("filter[city]", params.city);
  if (params.createdFrom) query.set("filter[created_from]", params.createdFrom);
  if (params.createdTo) query.set("filter[created_to]", params.createdTo);

  const envelope = await api.getWithMeta<CommercialLead[]>(
    `/api/v1/commercial-leads?${query.toString()}`,
  );

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

export function getCommercialLead(id: number | string): Promise<CommercialLead> {
  return api.get<CommercialLead>(`/api/v1/commercial-leads/${id}`);
}

export function updateCommercialLeadStatus(
  id: number | string,
  status: CommercialLeadStatus,
): Promise<CommercialLead> {
  return api.patch<CommercialLead>(`/api/v1/commercial-leads/${id}`, { status });
}

export function deleteCommercialLead(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/commercial-leads/${id}`);
}
