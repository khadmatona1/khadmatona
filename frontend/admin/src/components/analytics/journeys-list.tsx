"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Journey, JourneyStep } from "@/types/analytics";
import { countryFlag, countryName, formatDateTime, formatDuration } from "@/components/analytics/format";
import { useAnalyticsLabels } from "@/components/analytics/use-analytics-labels";

/**
 * Anonymized visitor journeys: "Visitor #A8F2 → Google → Home → Property
 * #123 → Gallery → Contact form started → Phone field → Form abandoned".
 * The label is a short hash computed server-side. No raw identifier, IP
 * or form value is ever shown, because none is ever stored.
 */
export function JourneysList({ journeys, emptyLabel }: { journeys: Journey[]; emptyLabel: string }) {
  const t = useTranslations("Analytics");
  const locale = useLocale();

  if (journeys.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {journeys.map((journey) => (
        <li key={journey.id} className="rounded-md border border-border p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="font-mono font-semibold text-text">{t("journeys.visitor", { label: journey.visitor_label })}</span>
            {journey.converted ? <Badge tone="success">{t("journeys.converted")}</Badge> : null}
            {journey.returning ? <Badge tone="info">{t("journeys.returning")}</Badge> : null}
            <span className="text-[0.78rem] text-text-muted">
              {formatDateTime(journey.started_at, locale)} · {formatDuration(journey.duration_seconds, locale)} ·{" "}
              {t(`devices.${journey.device_type}`)}
              {journey.browser ? ` · ${journey.browser}` : ""}
              {journey.country ? ` · ${countryFlag(journey.country)} ${countryName(journey.country, locale)}` : ""}
              {journey.city ? ` ${journey.city}` : ""}
            </span>
          </div>

          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Chip tone="source">
                {t(`sources.${journey.source}`)}
                {journey.utm_campaign ? ` · ${journey.utm_campaign}` : ""}
              </Chip>
            </li>
            {journey.steps.map((step, index) => (
              <li key={`${step.type}-${step.at}-${index}`} className="flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted rtl:-scale-x-100" aria-hidden="true" />
                <StepChip step={step} />
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

function StepChip({ step }: { step: JourneyStep }) {
  const t = useTranslations("Analytics");
  const labels = useAnalyticsLabels();
  const form = step.form_type ? t(`forms.${step.form_type}`) : "";

  switch (step.type) {
    case "property_view":
      return (
        <Chip tone="page">
          {step.property_id ? (
            <Link href={`/dashboard/properties/${step.property_id}`} className="hover:underline">
              {t("journeys.property", { id: step.property_id })}
              {step.property_title ? ` · ${step.property_title}` : ""}
            </Link>
          ) : (
            step.path
          )}
        </Chip>
      );
    case "page_view":
      return (
        <Chip tone="page">
          {step.page_type && step.page_type !== "other" ? t(`pageTypes.${step.page_type}`) : <bdi dir="ltr">{step.path}</bdi>}
        </Chip>
      );
    case "cta_click":
      return <Chip tone="click">{t("journeys.cta", { label: labels.cta(step.label) })}</Chip>;
    case "form_started":
    case "form_submitted":
    case "form_abandoned":
      return <Chip tone={step.type === "form_submitted" ? "success" : step.type === "form_abandoned" ? "warning" : "form"}>{t(`journeys.${step.type}`, { form })}</Chip>;
    case "form_field_interaction":
      return <Chip tone="form">{t("journeys.field", { field: labels.field(step.field) })}</Chip>;
    case "form_step":
      return <Chip tone="form">{t("journeys.step", { step: labels.step(step.label) })}</Chip>;
    default:
      return <Chip tone="click">{t.has(`events.${step.type}`) ? t(`events.${step.type}`) : step.type}</Chip>;
  }
}

const CHIP_TONES = {
  source: "border-gold-primary/40 bg-gold-primary/10 text-gold-primary",
  page: "border-border bg-surface-muted text-text",
  click: "border-info/30 bg-info-surface text-info",
  form: "border-border bg-surface text-text-muted",
  success: "border-success/30 bg-success-surface text-success",
  warning: "border-warning/30 bg-warning-surface text-warning",
} as const;

function Chip({ tone, children }: { tone: keyof typeof CHIP_TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex max-w-[16rem] items-center truncate rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold ${CHIP_TONES[tone]}`}>
      {children}
    </span>
  );
}
