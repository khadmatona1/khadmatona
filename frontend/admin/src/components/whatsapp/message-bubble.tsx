"use client";

import { useTranslations } from "next-intl";
import clsx from "clsx";
import { AlertCircle, Check, CheckCheck, Clock, FileText, MapPin } from "lucide-react";
import { whatsappMediaUrl } from "@/lib/whatsapp";
import type { WhatsAppMessage } from "@/types/whatsapp";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function StatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  const t = useTranslations("WhatsAppThread");
  const label = t(`status.${status}`);

  switch (status) {
    case "queued":
      return <Clock className="h-3.5 w-3.5" aria-label={label} />;
    case "sent":
      return <Check className="h-3.5 w-3.5" aria-label={label} />;
    case "delivered":
      return <CheckCheck className="h-3.5 w-3.5" aria-label={label} />;
    case "read":
      return <CheckCheck className="h-3.5 w-3.5 text-info" aria-label={label} />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5 text-error" aria-label={label} />;
    default:
      return null;
  }
}

/** One chat bubble: who sent it, content (text/media/location/template), time, delivery status. */
export function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const t = useTranslations("WhatsAppThread");
  const outbound = message.direction === "outbound";
  const isTemplate = message.type === "template";

  const senderLabel =
    message.sender_type === "ai"
      ? t("senderAi")
      : outbound
        ? (message.sender_name ?? t("senderAgent"))
        : null;

  return (
    <div className={clsx("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[70%]",
          outbound ? "bg-gold-primary/15 text-text" : "border border-border bg-surface text-text",
          message.status === "failed" && "border border-error/40",
        )}
      >
        {senderLabel && (
          <p className="mb-0.5 text-[0.7rem] font-bold tracking-wide text-gold-primary uppercase">{senderLabel}</p>
        )}

        {message.has_media && message.type === "image" && (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated proxy URL, not optimizable by next/image
          <img
            src={whatsappMediaUrl(message.id)}
            alt={message.body ?? t("image")}
            loading="lazy"
            className="mb-1 max-h-72 rounded-md"
          />
        )}
        {message.has_media && message.type === "audio" && (
          <audio controls preload="none" src={whatsappMediaUrl(message.id)} className="mb-1 max-w-full" />
        )}
        {message.has_media && message.type === "video" && (
          <video controls preload="none" src={whatsappMediaUrl(message.id)} className="mb-1 max-h-72 rounded-md" />
        )}
        {message.has_media && !["image", "audio", "video"].includes(message.type) && (
          <a
            href={whatsappMediaUrl(message.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1 flex items-center gap-1.5 font-semibold text-gold-primary hover:underline"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {message.media_filename ?? t("openAttachment")}
          </a>
        )}
        {message.type === "location" && (
          <p className="mb-1 flex items-center gap-1.5 text-text-muted">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t("location")}
          </p>
        )}
        {!message.has_media && !["text", "location", "template"].includes(message.type) && !message.body && (
          <p className="italic text-text-muted">[{message.type}]</p>
        )}

        {message.body && (
          <p className={clsx("break-words whitespace-pre-wrap", isTemplate && "italic text-text-muted")}>
            {message.body}
          </p>
        )}

        {message.status === "failed" && (
          <p className="mt-1 text-xs font-semibold text-error">
            {t("sendFailed")}
            {message.error_message ? ` - ${message.error_message}` : ""}
          </p>
        )}

        <p className="mt-1 flex items-center justify-end gap-1 text-[0.7rem] text-text-muted">
          <span>{timeFormatter.format(new Date(message.occurred_at))}</span>
          {outbound && <StatusIcon status={message.status} />}
        </p>
      </div>
    </div>
  );
}
