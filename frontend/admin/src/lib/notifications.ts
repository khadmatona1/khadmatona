import { api } from "@/lib/api";

export type NotificationData =
  | {
      type: "new_property_pending";
      property_id: number;
      property_title: string;
      commercial_id: number | null;
      commercial_name: string | null;
    }
  | {
      type: "whatsapp_message";
      conversation_id: number;
      contact_name: string | null;
      phone: string | null;
      preview: string;
    }
  | {
      type: "lead_callback_due";
      lead_id: number;
      lead_name: string;
      phone: string | null;
      callback_at: string | null;
    }
  | {
      type: "visit_assigned";
      visit_id: number;
      property_title: string | null;
      lead_name: string | null;
      scheduled_at: string;
    }
  // Unknown/future notification types still render (generic fallback in
  // NotificationBell) instead of crashing the dropdown.
  | { type: string; [key: string]: unknown };

export interface AppNotification {
  id: string;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  notifications: AppNotification[];
  unreadCount: number;
}

export async function listNotifications(): Promise<NotificationList> {
  const envelope = await api.getWithMeta<AppNotification[]>("/api/v1/notifications");

  return {
    notifications: envelope.data,
    unreadCount: (envelope.meta?.unread_count as number) ?? 0,
  };
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return api.patch<AppNotification>(`/api/v1/notifications/${id}/read`, {});
}

export function markAllNotificationsRead(): Promise<{ unread_count: number }> {
  return api.post<{ unread_count: number }>("/api/v1/notifications/read-all");
}
