import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PostsList } from "@/components/blog/posts-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Blog");
  return { title: t("title"), description: t("subtitle") };
}

export default function BlogPage() {
  const t = useTranslations("Blog");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16 lg:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-text-muted">{t("subtitle")}</p>
      </div>

      <Suspense fallback={<p className="text-text-muted">{t("loading")}</p>}>
        <PostsList />
      </Suspense>
    </div>
  );
}
