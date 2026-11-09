"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import {
  disconnectMeta,
  getSocialOverview,
  startMetaConnection,
  updateSocialSettings,
  verifyMetaConnection,
} from "@/lib/social";
import {
  SOCIAL_PLATFORMS,
  type PublishMode,
  type SocialOverview,
  type SocialSettings,
} from "@/types/social";

export default function SocialSettingsPage() {
  const t = useTranslations("SocialPublishing");
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  function apply(data: SocialOverview) {
    setOverview(data);
    setSettings(data.settings);
  }

  useEffect(() => {
    getSocialOverview()
      .then(apply)
      .catch(() => setLoadError(true));
  }, []);

  async function act(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
    } catch (caught) {
      modal.error(caught instanceof ApiError ? caught.message : t("actionError"));
      getSocialOverview().then(apply).catch(() => undefined);
    } finally {
      setIsBusy(false);
    }
  }

  function connect() {
    return act(async () => {
      const { url } = await startMetaConnection();
      window.location.assign(url);
    });
  }

  function verify() {
    return act(async () => {
      await verifyMetaConnection();
      modal.success(t("verifySuccess"));
    });
  }

  function disconnect() {
    return act(async () => {
      await disconnectMeta();
      apply(await getSocialOverview());
      modal.success(t("disconnected"));
    });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;

    return act(async () => {
      apply(await updateSocialSettings({ ...settings, caption_template: settings.caption_template || null }));
      modal.success(t("settingsSaved"));
    });
  }

  if (loadError) {
    return <Alert tone="error">{t("loadError")}</Alert>;
  }

  if (!overview || !settings) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  const isConnected = overview.accounts.facebook !== null;
  const needsReconnect = SOCIAL_PLATFORMS.some(
    (platform) => overview.accounts[platform]?.status === "needs_reconnect",
  );

  function setField<K extends keyof SocialSettings>(key: K, value: SocialSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  function checkbox(key: "facebook_enabled" | "instagram_enabled" | "default_facebook" | "default_instagram") {
    return (
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={settings?.[key] ?? false}
          onChange={(event) => setField(key, event.target.checked)}
          className="h-4 w-4 accent-gold-primary"
        />
        {t(key)}
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("settingsTitle")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("settingsSubtitle")}</p>
      </div>

      <Card className="flex w-full max-w-3xl flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-text">{t("connectionTitle")}</h2>

        {!overview.app_configured && <Alert tone="info">{t("appNotConfigured")}</Alert>}
        {needsReconnect && <Alert tone="error">{t("reconnectNeeded")}</Alert>}

        {SOCIAL_PLATFORMS.map((platform) => {
          const account = overview.accounts[platform];

          return (
            <div key={platform} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted p-3 text-sm">
              <div>
                <p className="font-semibold text-text">{t(platform)}</p>
                <p className="text-text-muted">{account?.name ?? t("notConnected")}</p>
              </div>
              {account ? (
                <Badge tone={account.status === "connected" ? "success" : "error"}>
                  {t(`accountStatus.${account.status}`)}
                </Badge>
              ) : (
                <Badge tone="neutral">{t("notConnected")}</Badge>
              )}
            </div>
          );
        })}

        {isConnected && !overview.accounts.instagram && (
          <Alert tone="warning">{t("instagramNotLinked")}</Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" isLoading={isBusy} disabled={!overview.app_configured} onClick={connect}>
            {isConnected ? t("reconnect") : t("connect")}
          </Button>
          {isConnected && (
            <>
              <Button size="sm" variant="secondary" disabled={isBusy} onClick={verify}>
                {t("verify")}
              </Button>
              <Button size="sm" variant="destructive" disabled={isBusy} onClick={disconnect}>
                {t("disconnect")}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="w-full max-w-3xl">
        <form onSubmit={save} className="flex flex-col gap-5">
          <h2 className="font-display text-lg font-semibold text-text">{t("preferencesTitle")}</h2>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-text">{t("platformsTitle")}</p>
            {checkbox("facebook_enabled")}
            {checkbox("instagram_enabled")}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-text">{t("defaultsTitle")}</p>
            {checkbox("default_facebook")}
            {checkbox("default_instagram")}
          </div>

          <div className="flex flex-col gap-2">
            <Select
              label={t("defaultMode")}
              value={settings.default_mode}
              onChange={(event) => setField("default_mode", event.target.value as PublishMode)}
            >
              <option value="manual">{t("modeManual")}</option>
              <option value="auto">{t("modeAuto")}</option>
            </Select>
            <p className="text-[0.76rem] text-text-muted">{t("defaultModeHint")}</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label={t("facebookMaxImages")}
              type="number"
              min={1}
              max={10}
              value={settings.facebook_max_images}
              onChange={(event) => setField("facebook_max_images", Number(event.target.value))}
            />
            <Field
              label={t("instagramMaxImages")}
              type="number"
              min={1}
              max={20}
              value={settings.instagram_max_images}
              onChange={(event) => setField("instagram_max_images", Number(event.target.value))}
            />
          </div>

          <Textarea
            label={t("captionTemplate")}
            hint={t("captionTemplateHint")}
            rows={14}
            value={settings.caption_template ?? overview.default_caption_template}
            onChange={(event) => setField("caption_template", event.target.value)}
          />

          <Button type="submit" isLoading={isBusy} className="self-start">
            {t("saveSettings")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
