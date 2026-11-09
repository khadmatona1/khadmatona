"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Card } from "@/components/ui/card";
import { PostForm } from "@/components/blog/post-form";
import { createPost } from "@/lib/blog";
import type { PostFormValues } from "@/types/blog";

export default function NewPostPage() {
  const router = useRouter();
  const t = useTranslations("DashboardBlog");

  async function handleSubmit(values: PostFormValues) {
    await createPost(values);
    modal.success(t("createSuccess"));
    router.push("/dashboard/blog");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("newTitle")}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <Card className="w-full max-w-3xl">
        <PostForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
