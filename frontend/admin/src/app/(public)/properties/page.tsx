import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PropertiesList } from "@/components/properties/properties-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Properties");
  return { title: t("title"), description: t("subtitle") };
}

export default function PropertiesPage() {
  const t = useTranslations("Properties");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-text-muted">{t("subtitle")}</p>
      </div>

      <Suspense fallback={<p className="text-text-muted">{t("loading")}</p>}>
        <PropertiesList />
      </Suspense>
    </div>
  );
}
