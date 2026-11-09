import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ApiError } from "@/lib/api";
import { getPost } from "@/lib/blog";

export const revalidate = 60;

// Article body images (as opposed to the cover image above) are always
// below the fold, so they're safe to defer regardless of how long the
// article is - react-markdown renders plain <img> for Markdown ![]() syntax
// with no loading attribute by default.
const MARKDOWN_COMPONENTS: Components = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `node` (the hast AST element) has to be destructured out so it isn't spread onto the DOM <img> below
  img: ({ node, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element -- Markdown-authored content image, not a static local asset
    <img {...props} loading="lazy" decoding="async" alt={props.alt ?? ""} />
  ),
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

async function loadPost(slug: string) {
  try {
    return await getPost(slug);
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      notFound();
    }
    throw caught;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  const t = await getTranslations("BlogDetail");

  return <BlogPostContent post={post} backToListLabel={t("backToList")} />;
}

function BlogPostContent({
  post,
  backToListLabel,
}: {
  post: Awaited<ReturnType<typeof loadPost>>;
  backToListLabel: string;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-5 sm:py-16 lg:px-6">
      <Link href="/blog" className="text-sm font-semibold text-gold-primary hover:underline">
        {backToListLabel}
      </Link>

      <h1 className="mt-3 text-balance font-display text-3xl font-semibold text-text sm:text-4xl">
        {post.title}
      </h1>
      {post.published_at && (
        <p className="mt-2 text-[0.85rem] text-text-muted">
          {dateFormatter.format(new Date(post.published_at))}
        </p>
      )}

      {post.cover_image && (
        <div className="mt-6 aspect-video overflow-hidden rounded-md bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- media-library-served image, this is the blog post page's LCP element */}
          <img
            src={post.cover_image}
            alt={post.title}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="prose-content mt-8 text-[0.98rem] leading-relaxed text-text">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
          {post.body}
        </ReactMarkdown>
      </div>
    </article>
  );
}
