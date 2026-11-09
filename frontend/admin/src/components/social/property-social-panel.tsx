"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocialPreferencesFields } from "@/components/social/social-preferences-fields";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { modal } from "@/lib/modal";
import {
  getPropertySocial,
  publishPropertyNow,
  retrySocialPublication,
  updatePropertySocialPreferences,
} from "@/lib/social";
import {
  SOCIAL_PLATFORMS,
  type PropertySocialState,
  type PublicationStatus,
  type SocialPlatform,
  type SocialPreferences,
} from "@/types/social";

const STATUS_POLL_MS = 5_000;

const STATUS_TONES = {
  pending: "info",
  publishing: "info",
  published: "success",
  failed: "error",
} as const satisfies Record<PublicationStatus, string>;

/** Admin-only (the API enforces it too): renders nothing for anyone else. */
export function PropertySocialPanel({ propertyId }: { propertyId: number }) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;

  return isAdmin ? <Panel propertyId={propertyId} /> : null;
}

function Panel({ propertyId }: { propertyId: number }) {
  const t = useTranslations("SocialPublishing");
  const [state, setState] = useState<PropertySocialState | null>(null);
  const [preferences, setPreferences] = useState<SocialPreferences | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPropertySocial(propertyId)
      .then((data) => {
        if (cancelled) return;
        setState(data);
        setPreferences(data.preferences);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Jobs run in the background, so the status only moves on a re-read.
  const isInFlight = state?.publications.some(
    (publication) => publication.status === "pending" || publication.status === "publishing",
  );

  useEffect(() => {
    if (!isInFlight) return;

    const timer = setInterval(() => {
      getPropertySocial(propertyId)
        .then(setState)
        .catch(() => {
          // Transient - the next tick tries again.
        });
    }, STATUS_POLL_MS);

    return () => clearInterval(timer);
  }, [isInFlight, propertyId]);

  const run = useCallback(
    async (action: () => Promise<PropertySocialState>, successMessage?: string) => {
      setIsBusy(true);
      try {
        setState(await action());
        if (successMessage) modal.success(successMessage);
      } catch (caught) {
        modal.error(caught instanceof ApiError ? caught.message : t("actionError"));
      } finally {
        setIsBusy(false);
      }
    },
    [t],
  );

  if (loadError) {
    return <Alert tone="error">{t("loadError")}</Alert>;
  }

  if (!state || !preferences) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  const publicationFor = (platform: SocialPlatform) =>
    state.publications.find((publication) => publication.platform === platform);

  // Published or in-flight platforms can't be sent again.
  const publishable = SOCIAL_PLATFORMS.filter((platform) => {
    const status = publicationFor(platform)?.status;
    return preferences[platform] && (status === undefined || status === "failed");
  });

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-text">{t("sectionTitle")}</h3>
        <p className="mt-1 text-sm text-text-muted">{t("sectionHint")}</p>
      </div>

      {!state.is_public && <Alert tone="info">{t("notPublic")}</Alert>}

      <SocialPreferencesFields value={preferences} onChange={setPreferences} />

      <div className="flex flex-col gap-2">
        {SOCIAL_PLATFORMS.map((platform) => {
          const publication = publicationFor(platform);

          return (
            <div key={platform} className="rounded-md bg-surface-muted p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-text">{t(platform)}</span>
                {publication ? (
                  <Badge tone={STATUS_TONES[publication.status]}>{t(`status.${publication.status}`)}</Badge>
                ) : (
                  <Badge tone="neutral">{t("status.none")}</Badge>
                )}
              </div>
              {publication?.error_message && (
                <p className="mt-2 text-[0.82rem] text-error">{publication.error_message}</p>
              )}
              {publication?.can_retry && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={isBusy}
                  onClick={() => run(() => retrySocialPublication(publication.id), t("retryQueued"))}
                >
                  {t("retry")}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <details className="text-sm text-text-muted">
        <summary className="cursor-pointer font-semibold">{t("captionPreview")}</summary>
        <p className="mt-2 whitespace-pre-line text-text">{state.caption_preview}</p>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={isBusy}
          onClick={() =>
            run(() => updatePropertySocialPreferences(propertyId, preferences), t("preferencesSaved"))
          }
        >
          {t("savePreferences")}
        </Button>
        <Button
          size="sm"
          isLoading={isBusy}
          disabled={!state.is_public || publishable.length === 0}
          onClick={() => run(() => publishPropertyNow(propertyId, publishable), t("publishQueued"))}
        >
          {t("publishNow")}
        </Button>
      </div>
    </section>
  );
}
