"use client";

import { useTranslations } from "next-intl";
import { PostForm } from "@/components/blog/post-form";
import { modal } from "@/lib/modal";
import { createPost } from "@/lib/blog";
import type { Post, PostFormValues } from "@/types/blog";

export function PostCreateContent({ onCreated }: { onCreated?: (post: Post) => void }) {
  const t = useTranslations("DashboardBlog");

  async function handleSubmit(values: PostFormValues) {
    const post = await createPost(values);
    onCreated?.(post);
    modal.success(t("createSuccess"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-text">{t("newTitle")}</h2>
        <p className="mt-1 text-sm text-text-muted">{t("newSubtitle")}</p>
      </div>

      <PostForm submitLabel={t("createSubmit")} onSubmit={handleSubmit} />
    </div>
  );
}
