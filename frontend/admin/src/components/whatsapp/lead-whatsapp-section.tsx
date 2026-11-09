"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openConversationModal } from "@/components/whatsapp/conversation-modal";
import { StartConversationContent } from "@/components/whatsapp/start-conversation-content";
import { modal } from "@/lib/modal";
import { getWhatsAppStatus, listConversations } from "@/lib/whatsapp";
import type { Lead } from "@/types/lead";
import type { WhatsAppConversation, WhatsAppStatus } from "@/types/whatsapp";

/** Digits for a wa.me link - a local "0" trunk prefix becomes Morocco's 212. */
function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `212${digits.slice(1)}` : digits;
}

/**
 * The lead popup's WhatsApp block: opens the lead's existing conversation
 * (full history), or starts one. When WhatsApp isn't configured it degrades
 * to the plain wa.me link with a short explanation - no errors.
 */
export function LeadWhatsAppSection({ lead }: { lead: Lead }) {
  const t = useTranslations("LeadWhatsApp");
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [conversation, setConversation] = useState<WhatsAppConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [s, list] = await Promise.all([
          getWhatsAppStatus(),
          listConversations({ leadId: lead.id, perPage: 1 }).catch(() => null),
        ]);
        if (cancelled) return;
        setStatus(s);
        setConversation(list?.conversations[0] ?? null);
      } catch {
        // Non-blocking - falls through to the wa.me fallback below.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (conversation) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-text">{conversation.last_message_preview ?? t("noMessages")}</p>
          {conversation.unread_count > 0 && (
            <Badge tone="gold">{t("unread", { count: conversation.unread_count })}</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => openConversationModal(conversation.id)}>
          {t("openConversation")}
        </Button>
      </div>
    );
  }

  if (!lead.phone) {
    return <p className="text-sm text-text-muted">{t("noPhone")}</p>;
  }

  if (!status?.configured) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">{t("notConfigured")}</p>
        <a
          href={`https://wa.me/${toWhatsAppDigits(lead.phone)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gold-primary hover:underline"
        >
          {t("openWaMe")}
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-muted">{t("noConversation")}</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          modal.custom({
            content: (
              <StartConversationContent
                initialPhone={lead.phone ?? ""}
                initialName={lead.name}
                onStarted={(started) => {
                  setConversation(started);
                  openConversationModal(started.id);
                }}
              />
            ),
          })
        }
      >
        {t("startConversation")}
      </Button>
    </div>
  );
}
