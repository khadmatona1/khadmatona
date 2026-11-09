"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PostForm } from "@/components/blog/post-form";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { getPost, updatePost } from "@/lib/blog";
import type { Post, PostFormValues } from "@/types/blog";

export function PostEditContent({
  slug,
  onUpdated,
}: {
  slug: string;
  /** Keeps the underlying list row in sync after a successful edit, since
   * the list doesn't refetch on its own. */
  onUpdated?: (post: Post) => void;
}) {
  const t = useTranslations("DashboardBlog");
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fetched by slug, not id - see the comment in Blog's routes.php for
    // why there's no separate admin "get by id" route to use instead.
    getPost(slug)
      .then((data) => {
        if (!cancelled) setPost(data);
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError && caught.status === 404 ? t("notFound") : t("loadError"),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [slug]);

  async function handleSubmit(values: PostFormValues) {
    if (!post) return;
    // Updates are still by numeric id - PUT /posts/{post} binds by id,
    // unaffected by the GET-route collision this popup's slug fetch works
    // around (different HTTP method, no URI collision).
    const updated = await updatePost(post.id, values);
    onUpdated?.(updated);
    modal.success(t("editSuccess"));
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !post) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-balance text-text">
          {t("editTitle")}
        </h2>
        <p className="mt-1 truncate text-sm text-text-muted">{post.title}</p>
      </div>

      <PostForm
        initialValues={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          body: post.body,
          status: post.status,
          published_at: post.published_at ? post.published_at.slice(0, 10) : "",
        }}
        existingCoverImage={post.cover_image}
        submitLabel={t("editSubmit")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
