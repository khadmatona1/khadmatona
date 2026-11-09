"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";
import { ApiError } from "@/lib/api";
import { getSettingsForEdit, updateSettings } from "@/lib/settings";
import {
  TRANSLATABLE_SETTING_FIELDS,
  type LocalizedValue,
  type SettingsEdit,
  type TranslatableSettingField,
} from "@/types/settings";

const LOCALE_LABELS: Record<Locale, string> = { fr: "FR", en: "EN", ar: "AR" };

type PlainFields = Pick<
  SettingsEdit,
  | "contact_phone"
  | "contact_email"
  | "contact_whatsapp"
  | "social_facebook"
  | "social_instagram"
  | "social_linkedin"
  | "social_whatsapp"
>;

const EMPTY_TRANSLATIONS = Object.fromEntries(
  TRANSLATABLE_SETTING_FIELDS.map((field) => [field, {}]),
) as Record<TranslatableSettingField, LocalizedValue>;

export default function SettingsPage() {
  const t = useTranslations("SettingsPage");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeLocale, setActiveLocale] = useState<Locale>("fr");

  const [plain, setPlain] = useState<PlainFields>({
    contact_phone: "",
    contact_email: "",
    contact_whatsapp: "",
    social_facebook: "",
    social_instagram: "",
    social_linkedin: "",
    social_whatsapp: "",
  });
  const [translations, setTranslations] =
    useState<Record<TranslatableSettingField, LocalizedValue>>(EMPTY_TRANSLATIONS);

  useEffect(() => {
    let cancelled = false;

    getSettingsForEdit()
      .then((data) => {
        if (cancelled) return;
        setPlain({
          contact_phone: data.contact_phone ?? "",
          contact_email: data.contact_email ?? "",
          contact_whatsapp: data.contact_whatsapp ?? "",
          social_facebook: data.social_facebook ?? "",
          social_instagram: data.social_instagram ?? "",
          social_linkedin: data.social_linkedin ?? "",
          social_whatsapp: data.social_whatsapp ?? "",
        });
        setTranslations(data.translations);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, []);

  function setPlainField(field: keyof PlainFields, value: string) {
    setPlain((current) => ({ ...current, [field]: value }));
  }

  function setTranslatedField(field: TranslatableSettingField, value: string) {
    setTranslations((current) => ({
      ...current,
      [field]: { ...current[field], [activeLocale]: value },
    }));
  }

  function translated(field: TranslatableSettingField): string {
    return translations[field]?.[activeLocale] ?? "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const payloadTranslations: Record<Locale, Partial<Record<TranslatableSettingField, string>>> = {
      fr: {},
      en: {},
      ar: {},
    };
    for (const field of TRANSLATABLE_SETTING_FIELDS) {
      for (const locale of SUPPORTED_LOCALES) {
        payloadTranslations[locale][field] = translations[field]?.[locale] ?? "";
      }
    }

    try {
      const saved = await updateSettings({ ...plain, translations: payloadTranslations });
      setTranslations(saved.translations);
      modal.success(t("saveSuccess"));
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (loadError) {
    return <Alert tone="error">{loadError}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-5">
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("contactSection")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("phone")}
              value={plain.contact_phone ?? ""}
              onChange={(event) => setPlainField("contact_phone", event.target.value)}
            />
            <Field
              label={t("email")}
              type="email"
              value={plain.contact_email ?? ""}
              onChange={(event) => setPlainField("contact_email", event.target.value)}
            />
            <Field
              label={t("whatsapp")}
              value={plain.contact_whatsapp ?? ""}
              onChange={(event) => setPlainField("contact_whatsapp", event.target.value)}
            />
          </div>
        </Card>

        {/* Every field below this point is translatable - one locale tab
            is edited at a time, switching tabs doesn't lose unsaved edits
            in the other locales (all three live in local state at once). */}
        <div className="flex items-center gap-0.5 self-start rounded-full border border-border-strong p-0.5 text-[0.72rem] font-bold">
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setActiveLocale(locale)}
              className={clsx(
                "rounded-full px-3 py-1.5 transition-colors",
                locale === activeLocale
                  ? "bg-gradient-gold text-white"
                  : "text-text-muted hover:text-text",
              )}
            >
              {LOCALE_LABELS[locale]}
            </button>
          ))}
        </div>

        <Card className="flex flex-col gap-5">
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("contactSection")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("address")}
              value={translated("address")}
              onChange={(event) => setTranslatedField("address", event.target.value)}
            />
            <Field
              label={t("businessHoursWeekdays")}
              value={translated("business_hours_weekdays")}
              onChange={(event) => setTranslatedField("business_hours_weekdays", event.target.value)}
            />
            <Field
              label={t("businessHoursSaturday")}
              value={translated("business_hours_saturday")}
              onChange={(event) => setTranslatedField("business_hours_saturday", event.target.value)}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("homepageSection")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("heroEyebrow")}
              value={translated("hero_eyebrow")}
              onChange={(event) => setTranslatedField("hero_eyebrow", event.target.value)}
            />
            <Field
              label={t("heroTitleBefore")}
              value={translated("hero_title_before")}
              onChange={(event) => setTranslatedField("hero_title_before", event.target.value)}
            />
            <Field
              label={t("heroTitleAccent")}
              value={translated("hero_title_accent")}
              onChange={(event) => setTranslatedField("hero_title_accent", event.target.value)}
            />
            <Field
              label={t("heroTitleAfter")}
              value={translated("hero_title_after")}
              onChange={(event) => setTranslatedField("hero_title_after", event.target.value)}
            />
          </div>
          <Textarea
            label={t("heroSubtitle")}
            value={translated("hero_subtitle")}
            onChange={(event) => setTranslatedField("hero_subtitle", event.target.value)}
          />
          <Field
            label={t("heroClientsCount")}
            value={translated("hero_clients_count")}
            onChange={(event) => setTranslatedField("hero_clients_count", event.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["stat1", "stat2", "stat3", "stat4"] as const).map((stat) => (
              <div key={stat} className="flex flex-col gap-4">
                <Field
                  label={t(`${stat}Value`)}
                  value={translated(`${stat}_value`)}
                  onChange={(event) => setTranslatedField(`${stat}_value`, event.target.value)}
                />
                <Field
                  label={t(`${stat}Label`)}
                  value={translated(`${stat}_label`)}
                  onChange={(event) => setTranslatedField(`${stat}_label`, event.target.value)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("ctaSection")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as const).map((n) => (
              <div key={n} className="flex flex-col gap-4">
                <Field
                  label={t(`ctaStat${n}Value`)}
                  value={translated(`cta_stat${n}_value`)}
                  onChange={(event) => setTranslatedField(`cta_stat${n}_value`, event.target.value)}
                />
                <Field
                  label={t(`ctaStat${n}Label`)}
                  value={translated(`cta_stat${n}_label`)}
                  onChange={(event) => setTranslatedField(`cta_stat${n}_label`, event.target.value)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
            {t("socialSection")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("facebook")}
              value={plain.social_facebook ?? ""}
              onChange={(event) => setPlainField("social_facebook", event.target.value)}
            />
            <Field
              label={t("instagram")}
              value={plain.social_instagram ?? ""}
              onChange={(event) => setPlainField("social_instagram", event.target.value)}
            />
            <Field
              label={t("linkedin")}
              value={plain.social_linkedin ?? ""}
              onChange={(event) => setPlainField("social_linkedin", event.target.value)}
            />
            <Field
              label={t("whatsappUrl")}
              value={plain.social_whatsapp ?? ""}
              onChange={(event) => setPlainField("social_whatsapp", event.target.value)}
            />
          </div>
        </Card>

        <Button type="submit" isLoading={isSaving} className="self-start">
          {isSaving ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}
