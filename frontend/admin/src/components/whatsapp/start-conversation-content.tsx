"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { getWhatsAppStatus, listWhatsAppTemplates, startConversation } from "@/lib/whatsapp";
import type { WhatsAppConversation, WhatsAppStatus, WhatsAppTemplate } from "@/types/whatsapp";

/**
 * Popup to open a chat with a customer. WhatsApp only lets a business
 * message someone who hasn't written first via an approved template, so the
 * first message is always a template (the configured default unless another
 * approved one is picked).
 */
export function StartConversationContent({
  initialPhone = "",
  initialName = "",
  onStarted,
}: {
  initialPhone?: string;
  initialName?: string;
  onStarted: (conversation: WhatsAppConversation) => void;
}) {
  const t = useTranslations("WhatsAppStart");
  const [phone, setPhone] = useState(initialPhone);
  const [contactName, setContactName] = useState(initialName);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selected, setSelected] = useState(0);
  const [params, setParams] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const result = await getWhatsAppStatus();
        if (cancelled) return;
        setStatus(result);
        if (result.configured) {
          const list = await listWhatsAppTemplates().catch(() => []);
          if (!cancelled) setTemplates(list);
        }
      } catch {
        // Non-blocking - submitting still reports the real error from the API.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const options: WhatsAppTemplate[] =
    templates.length > 0
      ? templates
      : status
        ? [{ ...status.default_template, status: "APPROVED", body_params: 0 }]
        : [];
  const template = options[selected] ?? options[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await startConversation({
        phone,
        contactName,
        templateName: template?.name,
        templateLanguage: template?.language,
        params: params.slice(0, template?.body_params ?? 0).filter((p) => p.trim() !== ""),
      });
      modal.close();
      onStarted(result.conversation);
      modal.success(t("success"));
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.errors).length > 0) {
        const flattened: Record<string, string> = {};
        for (const [field, messages] of Object.entries(caught.errors)) flattened[field] = messages[0];
        setFieldErrors(flattened);
      } else {
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const notConfigured = status !== null && !status.configured;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("title")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      {notConfigured && <Alert tone="info">{t("notConfigured")}</Alert>}

      <Field
        label={t("phone")}
        required
        dir="ltr"
        hint={t("phoneHint")}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={fieldErrors.phone}
      />

      <Field
        label={t("contactName")}
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
        error={fieldErrors.contact_name}
      />

      {options.length > 0 && (
        <Select
          label={t("template")}
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
      )}

      {template &&
        Array.from({ length: template.body_params }).map((_, index) => (
          <Field
            key={`${template.name}-${index}`}
            label={t("param", { n: index + 1 })}
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

      <Button type="submit" isLoading={isSubmitting} disabled={notConfigured} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
