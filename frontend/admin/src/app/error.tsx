"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("PublicUx");
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-text">
        {t("loadErrorTitle")}
      </h1>
      <p className="text-text-muted">{t("loadErrorHint")}</p>
      <button
        onClick={retry}
        className="min-h-12 rounded-xl bg-gradient-gold px-6 font-semibold text-ink"
      >
        {t("retry")}
      </button>
      <Link href="/" className="text-gold-primary underline">
        {t("home")}
      </Link>
    </main>
  );
}
