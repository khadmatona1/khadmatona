"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Pagination } from "@/components/ui/pagination";
import { PostCard } from "@/components/blog/post-card";
import { PostCardSkeleton } from "@/components/blog/post-card-skeleton";
import { ApiError } from "@/lib/api";
import { listPosts } from "@/lib/blog";
import type { Pagination as PaginationData } from "@/types/property";
import type { Post } from "@/types/blog";

export function PostsList() {
  const t = useTranslations("Blog");
  const errors = useTranslations("Errors");

  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);

      try {
        const result = await listPosts({ page });
        if (cancelled) return;
        setPosts(result.posts);
        setPagination(result.pagination);
      } catch (caught) {
        if (cancelled) return;
        modal.error(caught instanceof ApiError ? caught.message : errors("generic"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [page, errors]);

  return (
    <div className="flex flex-col gap-8">
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PostCardSkeleton key={index} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-border-strong bg-surface-muted p-12 text-center">
          <h3 className="font-display text-xl font-semibold text-text">
            {t("noResultsTitle")}
          </h3>
          <p className="max-w-sm text-text-muted">{t("noResultsSubtitle")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
