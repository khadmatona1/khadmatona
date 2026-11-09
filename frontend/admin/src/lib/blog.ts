import { api } from "@/lib/api";
import type { Pagination } from "@/types/property";
import type { Post, PostFormValues } from "@/types/blog";

export interface ListPostsParams {
  page?: number;
  perPage?: number;
}

export interface PostList {
  posts: Post[];
  pagination: Pagination;
}

export async function listPosts(params: ListPostsParams = {}): Promise<PostList> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("per_page", String(params.perPage ?? 12));

  const envelope = await api.getWithMeta<Post[]>(`/api/v1/posts?${query.toString()}`);

  return {
    posts: envelope.data,
    pagination: (envelope.meta?.pagination as Pagination) ?? {
      current_page: 1,
      last_page: 1,
      per_page: params.perPage ?? 12,
      total: envelope.data.length,
    },
  };
}

export function getPost(slugOrId: string | number): Promise<Post> {
  return api.get<Post>(`/api/v1/posts/${slugOrId}`);
}

function toFormData(values: PostFormValues): FormData {
  const form = new FormData();
  form.set("title", values.title);
  if (values.slug) form.set("slug", values.slug);
  if (values.excerpt) form.set("excerpt", values.excerpt);
  form.set("body", values.body);
  form.set("status", values.status);
  if (values.published_at) form.set("published_at", values.published_at);
  if (values.cover_image) form.set("cover_image", values.cover_image);
  return form;
}

export function createPost(values: PostFormValues): Promise<Post> {
  return api.postForm<Post>("/api/v1/posts", toFormData(values));
}

export function updatePost(id: number | string, values: PostFormValues): Promise<Post> {
  return api.putForm<Post>(`/api/v1/posts/${id}`, toFormData(values));
}

export function deletePost(id: number | string): Promise<void> {
  return api.delete<void>(`/api/v1/posts/${id}`);
}
