export type PostStatus = "draft" | "published";

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  status: PostStatus;
  published_at: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostFormValues {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: PostStatus;
  published_at: string;
  /** A newly selected file pending upload - not yet-saved cover image. */
  cover_image: File | null;
}

export const POST_STATUSES: PostStatus[] = ["draft", "published"];
