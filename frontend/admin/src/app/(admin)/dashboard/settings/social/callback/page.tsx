"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { completeMetaConnection, selectMetaPage } from "@/lib/social";
import type { SocialPage } from "@/types/social";

/** Where Meta sends the Admin back after the login dialog. */
export default function SocialCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string; error?: string }>;
}) {
  const { code, state, error: metaError } = use(searchParams);
  const router = useRouter();
  const t = useTranslations("SocialPublishing");
  const [pages, setPages] = useState<SocialPage[] | null>(null);
  const [error, setError] = useState<string | null>(
    metaError || !code || !state ? t("loginCancelled") : null,
  );
  const [selecting, setSelecting] = useState<string | null>(null);
  // The code and state are single-use, and effects run twice in dev.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current || metaError || !code || !state) return;
    exchanged.current = true;

    completeMetaConnection(code, state)
      .then((data) => setPages(data.pages))
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.message : t("actionError"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [code, state, metaError]);

  async function select(page: SocialPage) {
    setSelecting(page.id);
    try {
      await selectMetaPage(page.id);
      modal.success(t("connected"));
      router.replace("/dashboard/settings/social");
    } catch (caught) {
      setSelecting(null);
      modal.error(caught instanceof ApiError ? caught.message : t("actionError"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">{t("choosePage")}</h1>

      {error && (
        <>
          <Alert tone="error">{error}</Alert>
          <Link href="/dashboard/settings/social">
            <Button variant="secondary">{t("backToSettings")}</Button>
          </Link>
        </>
      )}

      {!error && !pages && <p className="text-sm text-text-muted">{t("loading")}</p>}

      {pages?.length === 0 && <Alert tone="warning">{t("noPages")}</Alert>}

      {pages?.map((page) => (
        <Card key={page.id} className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-text">{page.name}</p>
            <p className="text-sm text-text-muted">
              {page.instagram ? `Instagram : @${page.instagram.username}` : t("instagramNotLinked")}
            </p>
          </div>
          <Button size="sm" isLoading={selecting === page.id} disabled={selecting !== null} onClick={() => select(page)}>
            {t("selectPage")}
          </Button>
        </Card>
      ))}
    </div>
  );
}
