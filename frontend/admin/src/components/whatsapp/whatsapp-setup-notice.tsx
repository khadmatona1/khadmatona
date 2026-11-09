"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import type { WhatsAppStatus } from "@/types/whatsapp";

/**
 * The clean "WhatsApp is not configured" state (missing Meta credentials) -
 * plus, for Admin, a checklist of exactly what to set and the webhook URL to
 * paste into Meta. Also flags the half-configured case where sending works
 * but incoming webhooks can't be verified yet.
 */
export function WhatsAppSetupNotice({ status }: { status: WhatsAppStatus }) {
  const t = useTranslations("WhatsAppSetup");
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;

  if (status.configured && status.webhooks_ready) return null;

  const notConfigured = !status.configured;

  return (
    <Alert tone={notConfigured ? "info" : "warning"} title={notConfigured ? t("notConfiguredTitle") : t("webhooksTitle")}>
      <p>{notConfigured ? t("notConfiguredBody") : t("webhooksBody")}</p>
      {isAdmin && (
        <div className="mt-3 flex flex-col gap-2 text-[0.82rem] text-text-muted">
          <p className="font-semibold text-text">{t("adminIntro")}</p>
          <ul className="list-disc ps-5">
            {notConfigured && (
              <>
                <li><code>WHATSAPP_ACCESS_TOKEN</code></li>
                <li><code>WHATSAPP_PHONE_NUMBER_ID</code></li>
              </>
            )}
            <li><code>WHATSAPP_APP_SECRET</code></li>
            <li><code>WHATSAPP_VERIFY_TOKEN</code></li>
          </ul>
          {status.webhook_url && (
            <p>
              {t("webhookUrl")}{" "}
              <bdi dir="ltr" className="rounded bg-surface px-1.5 py-0.5 font-mono text-text">
                {status.webhook_url}
              </bdi>
            </p>
          )}
          <p>{t("envHint")}</p>
        </div>
      )}
    </Alert>
  );
}
