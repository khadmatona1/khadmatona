"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlignLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailSection } from "@/components/ui/detail-section";
import { PostStatusBadge } from "@/components/blog/post-status-badge";
import { PostEditContent } from "@/components/blog/post-edit-content";
import { ApiError } from "@/lib/api";
import { modal } from "@/lib/modal";
import { deletePost, getPost } from "@/lib/blog";
import type { Post } from "@/types/blog";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function PostDetailContent({
  slug,
  onUpdated,
  onDeleted,
}: {
  slug: string;
  /** Forwarded to the edit popup opened from here, so the underlying list
   * row stays in sync after a save. */
  onUpdated?: (post: Post) => void;
  /** Lets the caller remove the row from its own list state - this popup
   * only knows about the single post it fetched, not the list. */
  onDeleted?: () => void;
}) {
  const t = useTranslations("DashboardBlog");
  const postForm = useTranslations("PostForm");
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

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

  function handleDelete() {
    if (!post) return;
    modal.confirm({
      message: t("confirmDelete", { title: post.title }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deletePost(post.id);
          modal.close();
          onDeleted?.();
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
          setIsDeleting(false);
        }
      },
    });
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t("loading")}</p>;
  }

  if (error || !post) {
    return <p className="text-sm text-error">{error ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-balance text-text">
            {post.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PostStatusBadge status={post.status} />
            {post.published_at && (
              <span className="text-sm text-text-muted">
                {t("publishedAt")} {dateFormatter.format(new Date(post.published_at))}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleDelete} isLoading={isDeleting}>
            {t("delete")}
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              modal.custom({ content: <PostEditContent slug={post.slug} onUpdated={onUpdated} /> })
            }
          >
            {t("edit")}
          </Button>
        </div>
      </div>

      {post.cover_image && (
        <div className="h-48 w-full overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- media-library-served thumbnail, not a next/image candidate */}
          <img src={post.cover_image} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <DetailSection icon={<AlignLeft className="h-4 w-4" />} title={postForm("excerpt")}>
        <p className="text-[0.95rem] text-text">{post.excerpt ?? t("noExcerpt")}</p>
      </DetailSection>

      <DetailSection icon={<FileText className="h-4 w-4" />} title={postForm("body")}>
        <div className="prose-content max-h-96 overflow-y-auto text-[0.95rem] text-text">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>
      </DetailSection>
    </div>
  );
}
