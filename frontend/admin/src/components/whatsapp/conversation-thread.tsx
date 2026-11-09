"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Building2, Send, User as UserIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { ConversationAdminControls } from "@/components/whatsapp/conversation-admin-controls";
import { MessageBubble } from "@/components/whatsapp/message-bubble";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import {
  getConversation,
  getWhatsAppStatus,
  listMessages,
  listWhatsAppTemplates,
  markConversationRead,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp";
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppStatus, WhatsAppTemplate } from "@/types/whatsapp";

const POLL_INTERVAL_MS = 8_000;

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function mergeMessages(current: WhatsAppMessage[], incoming: WhatsAppMessage[]): WhatsAppMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
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
 * Outside the 24h customer-service window WhatsApp only delivers approved
 * templates, so the composer is swapped for this picker (approved templates
 * from the Business Account, or the configured default when none are listed).
 */
function TemplateSender({
  conversationId,
  status,
  templates,
  onSent,
}: {
  conversationId: number;
  status: WhatsAppStatus;
  templates: WhatsAppTemplate[];
  onSent: (message: WhatsAppMessage) => void;
}) {
  const t = useTranslations("WhatsAppThread");
  const options: WhatsAppTemplate[] =
    templates.length > 0
      ? templates
      : [{ ...status.default_template, status: "APPROVED", body_params: 0 }];
  const [selected, setSelected] = useState(0);
  const [params, setParams] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const template = options[selected] ?? options[0];

  async function handleSend() {
    setIsSending(true);
    try {
      const message = await sendWhatsAppTemplate(conversationId, {
        name: template.name,
        language: template.language,
        params: params.slice(0, template.body_params).filter((p) => p.trim() !== ""),
      });
      onSent(message);
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-warning-surface/40 p-4">
      <p className="text-sm font-semibold text-warning">{t("windowClosedTitle")}</p>
      <p className="text-sm text-text-muted">{t("windowClosedBody")}</p>

      <Select
        label={t("templateLabel")}
        value={String(selected)}
        onChange={(event) => {
          setSelected(Number(event.target.value));
          setParams([]);
        }}
      >
        {options.map((option, index) => (
          <option key={`${option.name}-${option.language}`} value={index}>
            {option.name} ({option.language})
          </option>
        ))}
      </Select>

      {Array.from({ length: template.body_params }).map((_, index) => (
        <Field
          key={`${template.name}-${index}`}
          label={t("templateParam", { n: index + 1 })}
          value={params[index] ?? ""}
          onChange={(event) =>
            setParams((current) => {
              const next = [...current];
              next[index] = event.target.value;
              return next;
            })
          }
        />
      ))}

      <Button className="self-start" onClick={handleSend} isLoading={isSending}>
        {t("sendTemplate")}
      </Button>
    </div>
  );
}

export function ConversationThread({
  conversationId,
  onConversationChange,
  onBack,
  onOpenLead,
  onOpenContact,
}: {
  conversationId: number;
  /** Keeps a surrounding list (inbox) in sync with unread count/preview/assignment changes. */
  onConversationChange?: (conversation: WhatsAppConversation) => void;
  /** Mobile: return from the thread to the conversation list. */
  onBack?: () => void;
  onOpenLead?: (leadId: number) => void;
  onOpenContact?: (contactId: number) => void;
}) {
  const t = useTranslations("WhatsAppThread");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;

  const [conversation, setConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  // The polling effect publishes its own loader here so event handlers can
  // trigger an immediate refresh without owning the effect's local closure.
  const reloadRef = useRef<() => void>(() => {});
  const onChangeRef = useRef(onConversationChange);

  useEffect(() => {
    onChangeRef.current = onConversationChange;
  });

  useEffect(() => {
    let cancelled = false;

    async function load(initial: boolean) {
      try {
        const [conv, page] = await Promise.all([
          getConversation(conversationId),
          listMessages(conversationId, { limit: 50 }),
        ]);
        if (cancelled) return;

        setConversation(conv);
        onChangeRef.current?.(conv);
        setMessages((current) => mergeMessages(current, page.messages));
        if (initial) setHasMore(page.hasMore);

        // Being on screen with unread messages = the agent is reading them.
        if (conv.unread_count > 0) {
          markConversationRead(conversationId)
            .then((updated) => {
              if (cancelled) return;
              setConversation(updated);
              onChangeRef.current?.(updated);
            })
            .catch(() => {
              // Cosmetic (badge/read receipt) - the next poll retries.
            });
        }
      } catch (caught) {
        if (initial && !cancelled) {
          setError(caught instanceof ApiError && caught.status === 404 ? t("notFound") : t("loadError"));
        }
      } finally {
        if (initial && !cancelled) setIsLoading(false);
      }
    }

    reloadRef.current = () => {
      load(false);
    };
    load(true);
    const interval = setInterval(() => load(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render; the thread is re-keyed per conversation
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const result = await getWhatsAppStatus();
        if (!cancelled) setStatus(result);
      } catch {
        // Non-blocking - the composer just stays disabled without a status.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const windowClosed = conversation !== null && !conversation.window_open;
  const needsTemplates = windowClosed && status?.configured === true;

  useEffect(() => {
    if (!needsTemplates) return;
    let cancelled = false;

    async function run() {
      try {
        const result = await listWhatsAppTemplates();
        if (!cancelled) setTemplates(result);
      } catch {
        // Falls back to the configured default template.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [needsTemplates]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function handleLoadOlder() {
    if (messages.length === 0) return;
    setIsLoadingOlder(true);
    stickToBottom.current = false;
    try {
      const page = await listMessages(conversationId, { beforeId: messages[0].id, limit: 50 });
      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore(page.hasMore);
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("loadError"));
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || isSending) return;

    setIsSending(true);
    try {
      const message = await sendWhatsAppMessage(conversationId, body);
      stickToBottom.current = true;
      setMessages((current) => mergeMessages(current, [message]));
      setDraft("");
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("sendFailed"));
      // A rejected send is still recorded server-side as a failed message.
      stickToBottom.current = true;
      reloadRef.current();
    } finally {
      setIsSending(false);
    }
  }

  function handleConversationChange(updated: WhatsAppConversation) {
    setConversation(updated);
    onConversationChange?.(updated);
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !conversation) {
    return <p className="p-6 text-sm text-error">{error ?? t("notFound")}</p>;
  }

  const displayName = conversation.contact_name ?? conversation.phone ?? conversation.wa_id;
  const canSend = status?.configured === true;
  const days = messages.map((m) => dayFormatter.format(new Date(m.occurred_at)));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("back")}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-muted lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-gold font-mono text-sm font-bold text-white">
          {initials(displayName) || "#"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text">{displayName}</p>
          <p className="truncate text-xs text-text-muted">
            <bdi dir="ltr">{conversation.phone ?? conversation.wa_id}</bdi>
            {" · "}
            {conversation.window_open && conversation.window_expires_at
              ? t("windowOpenUntil", { time: timeFormatter.format(new Date(conversation.window_expires_at)) })
              : t("windowClosedShort")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {conversation.lead_id && onOpenLead && (
            <Button size="sm" variant="secondary" onClick={() => onOpenLead(conversation.lead_id!)}>
              <Building2 className="me-1 h-3.5 w-3.5" aria-hidden="true" />
              {t("viewLead")}
            </Button>
          )}
          {conversation.contact_id && onOpenContact && (
            <Button size="sm" variant="secondary" onClick={() => onOpenContact(conversation.contact_id!)}>
              <UserIcon className="me-1 h-3.5 w-3.5" aria-hidden="true" />
              {t("viewContact")}
            </Button>
          )}
        </div>
      </div>

      {isAdmin && (
        <ConversationAdminControls
          conversation={conversation}
          aiAvailable={status?.ai_enabled === true}
          onChange={handleConversationChange}
        />
      )}

      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto bg-surface-muted p-4">
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <Button size="sm" variant="secondary" onClick={handleLoadOlder} isLoading={isLoadingOlder}>
              {t("loadOlder")}
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">{t("empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message, index) => {
              const day = days[index];
              const showDay = index === 0 || days[index - 1] !== day;

              return (
                <div key={message.id} className="flex flex-col gap-2">
                  {showDay && (
                    <p className="my-1 self-center rounded-full bg-surface px-3 py-0.5 text-[0.7rem] font-semibold text-text-muted capitalize">
                      {day}
                    </p>
                  )}
                  <MessageBubble message={message} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {status && !canSend ? (
        <div className="border-t border-border p-4">
          <Alert tone="info">{t("notConfiguredComposer")}</Alert>
        </div>
      ) : windowClosed && status ? (
        <TemplateSender
          conversationId={conversationId}
          status={status}
          templates={templates}
          onSent={(message) => {
            stickToBottom.current = true;
            setMessages((current) => mergeMessages(current, [message]));
            reloadRef.current();
          }}
        />
      ) : (
        <div className="flex items-end gap-2 border-t border-border p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            maxLength={4096}
            placeholder={t("composerPlaceholder")}
            aria-label={t("composerPlaceholder")}
            disabled={!canSend}
            className="max-h-40 min-h-[2.75rem] w-full resize-y rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 text-[0.95rem] text-text focus-visible:border-gold-primary disabled:opacity-60"
          />
          <Button onClick={handleSend} isLoading={isSending} disabled={!draft.trim() || !canSend} aria-label={t("send")}>
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
