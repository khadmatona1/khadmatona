export type WhatsAppMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";
export type WhatsAppDirection = "inbound" | "outbound";
export type WhatsAppSenderType = "customer" | "agent" | "ai" | "system";

export interface WhatsAppConversation {
  id: number;
  wa_id: string;
  phone: string | null;
  contact_name: string | null;
  lead_id: number | null;
  contact_id: number | null;
  assigned_user_id: number | null;
  assigned_user_name?: string | null;
  ai_enabled: boolean;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_inbound_at: string | null;
  /** Free-form replies are only allowed while true (24h customer-service window). */
  window_open: boolean;
  window_expires_at: string | null;
  created_at: string;
}

export interface WhatsAppMessage {
  id: number;
  conversation_id: number;
  direction: WhatsAppDirection;
  sender_type: WhatsAppSenderType;
  sender_user_id: number | null;
  sender_name?: string | null;
  /** text, image, audio, video, document, sticker, location, template, ... */
  type: string;
  body: string | null;
  has_media: boolean;
  media_mime: string | null;
  media_filename: string | null;
  status: WhatsAppMessageStatus;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  occurred_at: string;
}

export interface WhatsAppStatus {
  configured: boolean;
  webhooks_ready: boolean;
  ai_enabled: boolean;
  default_template: { name: string; language: string };
  /** Admin only. */
  webhook_url?: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  body_params: number;
}

export interface StartConversationValues {
  phone: string;
  contactName?: string;
  templateName?: string;
  templateLanguage?: string;
  params?: string[];
}
