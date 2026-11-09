import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type {
  StartConversationValues,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppStatus,
  WhatsAppTemplate,
} from "@/types/whatsapp";

const BASE = "/api/v1/whatsapp";

export function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  return api.get<WhatsAppStatus>(`${BASE}/status`);
}

export function listWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  return api.get<WhatsAppTemplate[]>(`${BASE}/templates`);
}

export interface ListConversationsParams {
  perPage?: number;
  search?: string;
  unreadOnly?: boolean;
  leadId?: number | string;
}

export async function listConversations(
  params: ListConversationsParams = {},
): Promise<{ conversations: WhatsAppConversation[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  query.set("per_page", String(params.perPage ?? 30));
  if (params.search) query.set("filter[search]", params.search);
  if (params.unreadOnly) query.set("filter[unread]", "1");
  if (params.leadId !== undefined) query.set("filter[lead_id]", String(params.leadId));

  const envelope = await api.getWithMeta<WhatsAppConversation[]>(`${BASE}/conversations?${query.toString()}`);

  return {
    conversations: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 30,
      total: envelope.data.length,
    },
  };
}

export function getConversation(id: number): Promise<WhatsAppConversation> {
  return api.get<WhatsAppConversation>(`${BASE}/conversations/${id}`);
}

export async function listMessages(
  conversationId: number,
  options: { beforeId?: number; limit?: number } = {},
): Promise<{ messages: WhatsAppMessage[]; hasMore: boolean }> {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 50));
  if (options.beforeId !== undefined) query.set("before_id", String(options.beforeId));

  const envelope = await api.getWithMeta<WhatsAppMessage[]>(
    `${BASE}/conversations/${conversationId}/messages?${query.toString()}`,
  );

  return { messages: envelope.data, hasMore: Boolean(envelope.meta?.has_more) };
}

export function sendWhatsAppMessage(conversationId: number, body: string): Promise<WhatsAppMessage> {
  return api.post<WhatsAppMessage>(`${BASE}/conversations/${conversationId}/messages`, { body });
}

export function sendWhatsAppTemplate(
  conversationId: number,
  template: { name: string; language: string; params?: string[] },
): Promise<WhatsAppMessage> {
  return api.post<WhatsAppMessage>(`${BASE}/conversations/${conversationId}/templates`, template);
}

export function startConversation(
  values: StartConversationValues,
): Promise<{ conversation: WhatsAppConversation; message: WhatsAppMessage }> {
  return api.post(`${BASE}/conversations/start`, {
    phone: values.phone,
    contact_name: values.contactName || undefined,
    name: values.templateName || undefined,
    language: values.templateLanguage || undefined,
    params: values.params && values.params.length > 0 ? values.params : undefined,
  });
}

export function markConversationRead(id: number): Promise<WhatsAppConversation> {
  return api.post<WhatsAppConversation>(`${BASE}/conversations/${id}/read`, {});
}

/** Admin only. */
export function updateConversation(
  id: number,
  patch: { assigned_user_id?: number | null; lead_id?: number | null; contact_id?: number | null; ai_enabled?: boolean },
): Promise<WhatsAppConversation> {
  return api.patch<WhatsAppConversation>(`${BASE}/conversations/${id}`, patch);
}

/**
 * Attachments are served by an authenticated proxy (Meta's own URLs expire
 * within minutes and need our token). In the browser the API is same-origin
 * via the Next proxy, so a relative URL carries the session cookie.
 */
export function whatsappMediaUrl(messageId: number): string {
  return `${BASE}/messages/${messageId}/media`;
}
