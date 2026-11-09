"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PostForm } from "@/components/blog/post-form";
import { getPost, updatePost } from "@/lib/blog";
import type { Post, PostFormValues } from "@/types/blog";

export default function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
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
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
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
    // unaffected by the GET-route collision this page's slug fetch works
    // around (different HTTP method, no URI collision).
    await updatePost(post.id, values);
    modal.success(t("editSuccess"));
    router.push("/dashboard/blog");
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !post) {
    return <Alert tone="error">{error ?? t("notFound")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
          {t("editTitle")}
        </h1>
        <p className="mt-1 truncate text-sm text-text-muted">{post.title}</p>
      </div>

      <Card className="w-full max-w-3xl">
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
      </Card>
    </div>
  );
}
