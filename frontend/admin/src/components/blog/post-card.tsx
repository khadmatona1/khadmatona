import Link from "next/link";
import clsx from "clsx";
import { CARD_INTERACTIVE_CLASSES } from "@/components/ui/card";
import type { Post } from "@/types/blog";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={clsx(
        "group flex flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm",
        CARD_INTERACTIVE_CLASSES,
      )}
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-charcoal to-ink">
        {post.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element -- media-library-served thumbnail, already f_auto/q_auto-optimized by Cloudinary
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-6">
        {post.published_at && (
          <p className="text-[0.72rem] font-semibold tracking-wide text-gold-primary uppercase">
            {dateFormatter.format(new Date(post.published_at))}
          </p>
        )}
        <p className="text-balance font-display text-lg font-semibold text-text">{post.title}</p>
        {post.excerpt && (
          <p className="line-clamp-3 text-[0.88rem] text-text-muted">{post.excerpt}</p>
        )}
      </div>
    </Link>
  );
}
