import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type { Contact, ContactFormValues, ContactType } from "@/types/contact";

export interface ListContactsParams {
  page?: number;
  perPage?: number;
  search?: string;
  type?: ContactType;
  commercialId?: number | string;
  sort?: string;
}

export interface ContactList {
  contacts: Contact[];
  pagination: Pagination;
}

export async function listContacts(params: ListContactsParams = {}): Promise<ContactList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 10));
  query.set("sort", params.sort ?? "-created_at");
  if (params.search) query.set("filter[search]", params.search);
  if (params.type) query.set("filter[type]", params.type);
  if (params.commercialId !== undefined) query.set("filter[commercial_id]", String(params.commercialId));

  const envelope = await api.getWithMeta<Contact[]>(`/api/v1/contacts?${query.toString()}`);

  return {
    contacts: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 10,
      total: envelope.data.length,
    },
  };
}

export function getContact(id: number | string): Promise<Contact> {
  return api.get<Contact>(`/api/v1/contacts/${id}`);
}

function toPayload(values: ContactFormValues): Record<string, unknown> {
  return {
    type: values.type,
    name: values.name,
    email: values.email || undefined,
    phone: values.phone || undefined,
    whatsapp: values.whatsapp || undefined,
    address: values.address || undefined,
    notes: values.notes || undefined,
  };
}

export function createContact(values: ContactFormValues): Promise<Contact> {
  return api.post<Contact>("/api/v1/contacts", toPayload(values));
}

export function updateContact(id: number | string, values: ContactFormValues): Promise<Contact> {
  return api.put<Contact>(`/api/v1/contacts/${id}`, toPayload(values));
}

export function deleteContact(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/contacts/${id}`);
}
