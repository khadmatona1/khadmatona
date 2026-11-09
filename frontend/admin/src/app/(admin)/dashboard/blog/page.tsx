"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { modal } from "@/lib/modal";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { PostStatusBadge } from "@/components/blog/post-status-badge";
import { PostDetailContent } from "@/components/blog/post-detail-content";
import { PostEditContent } from "@/components/blog/post-edit-content";
import { PostCreateContent } from "@/components/blog/post-create-content";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EyeIcon, PencilIcon, TrashIcon } from "@/components/ui/action-icons";
import { ApiError } from "@/lib/api";
import { deletePost, listPosts } from "@/lib/blog";
import type { Pagination as PaginationData } from "@/types/property";
import type { Post } from "@/types/blog";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function BlogListPage() {
  const t = useTranslations("DashboardBlog");
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        modal.error(caught instanceof ApiError ? caught.message : t("genericError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is stable per locale render
  }, [page]);

  function handlePostUpdated(updated: Post) {
    setPosts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleView(post: Post) {
    modal.custom({
      content: (
        <PostDetailContent
          slug={post.slug}
          onUpdated={handlePostUpdated}
          onDeleted={() => setPosts((current) => current.filter((p) => p.id !== post.id))}
        />
      ),
    });
  }

  function handleEdit(post: Post) {
    modal.custom({
      content: <PostEditContent slug={post.slug} onUpdated={handlePostUpdated} />,
    });
  }

  function handleCreate() {
    modal.custom({
      content: <PostCreateContent onCreated={(created) => setPosts((current) => [created, ...current])} />,
    });
  }

  function handleDelete(post: Post) {
    modal.confirm({
      message: t("confirmDelete", { title: post.title }),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      onConfirm: async () => {
        setDeletingId(post.id);
        try {
          await deletePost(post.id);
          setPosts((current) => current.filter((p) => p.id !== post.id));
          modal.success(t("deleteSuccess"));
        } catch (caught) {
          modal.error(caught instanceof ApiError ? caught.message : t("deleteError"));
        } finally {
          setDeletingId(null);
        }
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleCreate}>
          {t("addPost")}
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted p-8 text-center sm:p-12">
          <h3 className="font-display text-xl font-semibold text-text">
            {t("noResultsTitle")}
          </h3>
          <p className="mt-2 text-sm text-text-muted">{t("noResultsEmpty")}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableHeaderCell>{t("titleColumn")}</TableHeaderCell>
              <TableHeaderCell>{t("status")}</TableHeaderCell>
              <TableHeaderCell>{t("publishedAt")}</TableHeaderCell>
              <TableHeaderCell>{t("actions")}</TableHeaderCell>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell label={t("titleColumn")} className="max-w-[280px] truncate font-semibold">
                    {post.title}
                  </TableCell>
                  <TableCell label={t("status")}>
                    <PostStatusBadge status={post.status} />
                  </TableCell>
                  <TableCell label={t("publishedAt")}>
                    {post.published_at ? dateFormatter.format(new Date(post.published_at)) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-start gap-1">
                      <button
                        type="button"
                        onClick={() => handleView(post)}
                        title={t("view")}
                        aria-label={t("view")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(post)}
                        title={t("edit")}
                        aria-label={t("edit")}
                        className="rounded-md p-2 text-text-muted hover:bg-surface-muted hover:text-gold-primary"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post)}
                        disabled={deletingId === post.id}
                        title={deletingId === post.id ? t("deleting") : t("delete")}
                        aria-label={deletingId === post.id ? t("deleting") : t("delete")}
                        className="rounded-md p-2 text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
