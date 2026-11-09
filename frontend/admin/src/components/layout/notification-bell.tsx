"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PropertyDetailContent } from "@/components/properties/property-detail-content";
import { LeadDetailContent } from "@/components/leads/lead-detail-content";
import { VisitDetailContent } from "@/components/visits/visit-detail-content";
import { openConversationModal } from "@/components/whatsapp/conversation-modal";
import { BellIcon } from "@/components/ui/action-icons";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationData,
} from "@/lib/notifications";

const POLL_INTERVAL_MS = 60_000;

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Only Admin actually receives anything today (NewPropertyPendingApproval,
 * sent from PropertyController::store()) - the /api/v1/notifications
 * endpoint itself is role-agnostic (always scoped to the caller's own
 * notifications), but rendering the bell for a role that's never notified
 * would just be empty clutter.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const t = useTranslations("Notifications");
  const team = useTranslations("TeamWork");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Admin gets pending-approval notices; Admin and Commercials both get
  // WhatsApp message notices for the threads they own.
  const isAdmin =
    user?.roles?.some((role) => ["Admin", "Commercial", "SeniorCommercial"].includes(role)) ?? false;
  // Lets handleOpenNotification trigger an immediate refetch (after an
  // approve/reject clears a notification server-side) without pulling
  // `load` itself out of the effect below - a bare useCallback call in the
  // effect body trips react-hooks/set-state-in-effect, so the effect keeps
  // its own locally-scoped `load` (same shape as auth-context.tsx's
  // performCheck) and publishes it here for outside callers instead.
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!isAdmin) return;

    async function load() {
      try {
        const result = await listNotifications();
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch {
        // Non-blocking - the bell just stays at its last known state if this fails.
      } finally {
        setIsLoading(false);
      }
    }

    loadRef.current = load;
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAdmin) return null;

  function handleOpenNotification(notification: AppNotification) {
    setOpen(false);
    if (!notification.read_at) {
      setUnreadCount((count) => Math.max(0, count - 1));
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      markNotificationRead(notification.id).catch(() => {
        // Best-effort - a failed mark-as-read isn't worth surfacing an error for.
      });
    }

    const data = notification.data;
    if (data.type === "team_task_assigned") {
      router.push("/dashboard/tasks");
      return;
    }
    if (data.type === "lead_callback_due") {
      modal.custom({
        content: <LeadDetailContent id={(data as Extract<NotificationData, { type: "lead_callback_due" }>).lead_id} />,
      });
      return;
    }

    if (data.type === "whatsapp_message") {
      openConversationModal((data as Extract<NotificationData, { type: "whatsapp_message" }>).conversation_id);
      return;
    }

    if (data.type === "new_property_pending") {
      const propertyData = data as Extract<NotificationData, { type: "new_property_pending" }>;
      // Approving/rejecting from this popup clears the notification
      // server-side (PropertyController::clearPendingApprovalNotification) -
      // refetch right away so it drops out of the list instead of waiting
      // for the next poll.
      modal.custom({
        content: <PropertyDetailContent id={propertyData.property_id} onUpdated={() => loadRef.current()} />,
      });
      return;
    }

    if (data.type === "visit_assigned") {
      modal.custom({
        content: <VisitDetailContent id={(data as Extract<NotificationData, { type: "visit_assigned" }>).visit_id} />,
      });
    }
  }

  async function handleMarkAllRead() {
    setUnreadCount(0);
    setNotifications((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Best-effort - see handleOpenNotification.
    }
  }

  return (
    <div className="sm:relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("bell")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-text hover:bg-surface-muted"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute end-1 top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-error ring-2 ring-surface" />
        )}
      </button>

      <div
        role="menu"
        className={clsx(
          "absolute inset-x-4 top-full z-10 mt-2 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden origin-top-right rounded-md border border-border bg-surface shadow-lg sm:inset-x-auto sm:end-0 sm:w-80 sm:max-w-[90vw]",
          "transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
          <p className="text-sm font-semibold text-text">{t("title")}</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-gold-primary hover:underline"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>

        <div className="min-h-0 max-h-96 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <p className="px-3.5 py-6 text-center text-sm text-text-muted">{t("loading")}</p>
          ) : notifications.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm text-text-muted">{t("empty")}</p>
          ) : (
            notifications.map((notification) => {
              const isNewProperty = notification.data.type === "new_property_pending";
              const data = isNewProperty
                ? (notification.data as Extract<NotificationData, { type: "new_property_pending" }>)
                : null;
              const callbackDue =
                notification.data.type === "lead_callback_due"
                  ? (notification.data as Extract<NotificationData, { type: "lead_callback_due" }>)
                  : null;
              const whatsapp =
                notification.data.type === "whatsapp_message"
                  ? (notification.data as Extract<NotificationData, { type: "whatsapp_message" }>)
                  : null;
              const visitAssigned =
                notification.data.type === "visit_assigned"
                  ? (notification.data as Extract<NotificationData, { type: "visit_assigned" }>)
                  : null;

              return (
                <button
                  key={notification.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleOpenNotification(notification)}
                  className={clsx(
                    "block w-full border-b border-border px-3.5 py-3 text-start text-sm transition-colors last:border-b-0 hover:bg-surface-muted",
                    !notification.read_at && "bg-gold-primary/5",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!notification.read_at && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-primary" aria-hidden="true" />
                    )}
                    <div className="min-w-0 break-words">
                      {notification.data.type === "team_task_assigned" ? (
                        <p className="text-text">{team("assigned", { title: String(notification.data.title ?? "") })}</p>
                      ) : data ? (
                        <p className="text-text">
                          {t("newPropertyPending", {
                            commercial: data.commercial_name ?? "",
                            title: data.property_title,
                          })}
                        </p>
                      ) : callbackDue ? (
                        <p className="text-text">
                          {t("leadCallbackDue", { name: callbackDue.lead_name, phone: callbackDue.phone ?? "-" })}
                        </p>
                      ) : whatsapp ? (
                        <p className="text-text">
                          {t("whatsappMessage", {
                            name: whatsapp.contact_name ?? whatsapp.phone ?? "",
                            preview: whatsapp.preview,
                          })}
                        </p>
                      ) : visitAssigned ? (
                        <p className="text-text">
                          {t("visitAssigned", {
                            lead: visitAssigned.lead_name ?? "",
                            property: visitAssigned.property_title ?? "",
                          })}
                        </p>
                      ) : (
                        <p className="text-text">{t("generic")}</p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">
                        {dateFormatter.format(new Date(notification.created_at))}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
