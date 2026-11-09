"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactDetailContent } from "@/components/contacts/contact-detail-content";
import { LeadDetailContent } from "@/components/leads/lead-detail-content";
import { ConversationThread } from "@/components/whatsapp/conversation-thread";
import { StartConversationContent } from "@/components/whatsapp/start-conversation-content";
import { WhatsAppSetupNotice } from "@/components/whatsapp/whatsapp-setup-notice";
import { modal } from "@/lib/modal";
import { getWhatsAppStatus, listConversations } from "@/lib/whatsapp";
import type { WhatsAppConversation, WhatsAppStatus } from "@/types/whatsapp";

const POLL_INTERVAL_MS = 10_000;
const PAGE_SIZE = 30;

const listTimeFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const todayTimeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString()
    ? todayTimeFormatter.format(date)
    : listTimeFormatter.format(date);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * The shared WhatsApp inbox: conversation list on the left (live-refreshed,
 * searchable, unread-first-class) and the selected conversation's full
 * history + composer on the right. Admin sees every conversation; a
 * Commercial only those assigned to them - the API enforces that, this just
 * renders whatever it returns.
 */
export function WhatsAppInbox({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useTranslations("DashboardWhatsApp");
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const reloadRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const result = await getWhatsAppStatus();
        if (!cancelled) setStatus(result);
      } catch {
        // Non-blocking - the inbox still lists stored history without it.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await listConversations({ perPage, search, unreadOnly });
        if (cancelled) return;
        setConversations(result.conversations);
        setTotal(result.pagination.total);
        setLoadFailed(false);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    reloadRef.current = () => {
      load();
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [perPage, search, unreadOnly]);

  function handleConversationChange(updated: WhatsAppConversation) {
    setConversations((current) => current.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  function handleStart() {
    modal.custom({
      content: (
        <StartConversationContent
          onStarted={(conversation) => {
            setSelectedId(conversation.id);
            reloadRef.current();
          }}
        />
      ),
    });
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleStart}>
          <Plus className="me-1 h-4 w-4" aria-hidden="true" />
          {t("newConversation")}
        </Button>
      </div>

      {status && <WhatsAppSetupNotice status={status} />}

      <div className="grid h-[calc(100vh-15rem)] min-h-[28rem] grid-cols-1 gap-4 lg:grid-cols-[21rem_1fr]">
        <Card className={clsx("flex min-h-0 flex-col overflow-hidden !p-0", selectedId !== null && "max-lg:hidden")}>
          <div className="flex flex-col gap-2 border-b border-border p-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchPlaceholder")}
                className="w-full min-w-0 rounded-sm border-[1.5px] border-border-strong bg-surface px-3 py-2 text-sm text-text focus-visible:border-gold-primary"
              />
            </form>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => setUnreadOnly(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-gold-primary)]"
              />
              {t("unreadOnly")}
              {totalUnread > 0 && (
                <span className="rounded-full bg-gold-primary px-1.5 py-0.5 text-[0.65rem] text-white">{totalUnread}</span>
              )}
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-text-muted">{t("loading")}</p>
            ) : loadFailed && conversations.length === 0 ? (
              <p className="p-4 text-sm text-error">{t("loadError")}</p>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-semibold text-text">{t("noConversationsTitle")}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {search || unreadOnly ? t("noConversationsSearch") : t("noConversations")}
                </p>
              </div>
            ) : (
              <ul>
                {conversations.map((conversation) => {
                  const name = conversation.contact_name ?? conversation.phone ?? conversation.wa_id;
                  const active = conversation.id === selectedId;

                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        className={clsx(
                          "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-start transition-colors hover:bg-surface-muted",
                          active && "bg-gold-primary/10",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-gold font-mono text-sm font-bold text-white">
                          {initials(name) || "#"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={clsx(
                                "truncate text-sm text-text",
                                conversation.unread_count > 0 ? "font-bold" : "font-semibold",
                              )}
                            >
                              {name}
                            </span>
                            <span className="shrink-0 text-[0.7rem] text-text-muted">
                              {formatWhen(conversation.last_message_at)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-text-muted">
                              {conversation.last_message_preview ?? ""}
                            </span>
                            {conversation.unread_count > 0 && (
                              <span className="shrink-0 rounded-full bg-gold-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                                {conversation.unread_count}
                              </span>
                            )}
                          </span>
                          {conversation.assigned_user_name && (
                            <span className="mt-0.5 block truncate text-[0.68rem] text-text-muted">
                              {conversation.assigned_user_name}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {conversations.length < total && (
              <div className="p-3 text-center">
                <Button size="sm" variant="secondary" onClick={() => setPerPage((n) => n + PAGE_SIZE)}>
                  {t("loadMore")}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className={clsx("min-h-0 overflow-hidden !p-0", selectedId === null && "max-lg:hidden")}>
          {selectedId === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <MessageCircle className="h-10 w-10 text-text-muted" aria-hidden="true" />
              <p className="font-semibold text-text">{t("selectConversation")}</p>
              <p className="max-w-xs text-sm text-text-muted">{t("selectConversationHint")}</p>
            </div>
          ) : (
            <ConversationThread
              key={selectedId}
              conversationId={selectedId}
              onConversationChange={handleConversationChange}
              onBack={() => setSelectedId(null)}
              onOpenLead={(leadId) => modal.custom({ content: <LeadDetailContent id={leadId} /> })}
              onOpenContact={(contactId) => modal.custom({ content: <ContactDetailContent id={contactId} /> })}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
