import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  PenLine,
} from "lucide-react";
import { CurtainLink } from "../../components/PageCurtain";
import { SecondaryPage } from "../../components/site/SecondaryPage";
import { BlogCard } from "../../components/site/BlogCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Reveal } from "../../components/site/Reveal";
import { Seo } from "../../seo/Seo";
import { sanitizeHtml } from "../../lib/notes";
import {
  fetchPostBySlug,
  fetchRelatedPosts,
  formatPostDate,
  readingTimeMinutes,
  tidyDashes,
  type BlogPost,
} from "../../lib/blog";

const PROSE_CLASS = [
  "mt-10 text-base leading-[1.9] text-white/65",
  "[&_h2]:mt-14 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-white",
  "[&_h3]:mt-10 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white/90",
  "[&_p]:mt-5",
  "[&_strong]:font-semibold [&_strong]:text-white/90",
  "[&_a]:text-[#cf9eff] [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-white",
  "[&_ul]:mt-5 [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-6 [&_ul]:marker:text-[#cf9eff]/60",
  "[&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:space-y-2.5 [&_ol]:pl-6 [&_ol]:marker:text-[#cf9eff]/60",
  "[&_li]:text-white/65",
  "[&_blockquote]:mt-8 [&_blockquote]:border-l-2 [&_blockquote]:border-[#cf9eff]/50 [&_blockquote]:pl-5 [&_blockquote]:text-white/75 [&_blockquote]:italic",
  "[&_figure]:mt-10 [&_figure]:overflow-hidden [&_figure]:rounded-2xl [&_figure]:border [&_figure]:border-white/10 [&_figure]:bg-white/[0.03]",
  "[&_figure_img]:block [&_figure_img]:h-auto [&_figure_img]:w-full",
  "[&_figcaption]:hidden",
  "[&_img]:mt-8 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-2xl [&_img]:border [&_img]:border-white/10",
].join(" ");

function ShareIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d={path} />
    </svg>
  );
}

const SHARE_PATHS = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
} as const;

function PostSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-56 rounded-full bg-white/[0.07]" />
      <div className="mt-8 h-[380px] rounded-3xl bg-white/[0.05] sm:h-[460px]" />
      <div className="mt-10 space-y-4">
        <div className="h-4 w-full rounded-full bg-white/[0.06]" />
        <div className="h-4 w-11/12 rounded-full bg-white/[0.06]" />
        <div className="h-4 w-4/5 rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

export default function BlogPostPage() {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [related, setRelated] = useState<BlogPost[]>([]);

  useEffect(() => {
    let cancelled = false;
    setPost(undefined);
    setRelated([]);
    fetchPostBySlug(slug)
      .then(async (row) => {
        if (cancelled) return;
        setPost(row);
        if (row) {
          const posts = await fetchRelatedPosts(row, 3);
          if (!cancelled) setRelated(posts);
        }
      })
      .catch(() => {
        if (!cancelled) setPost(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const html = useMemo(
    () => (post ? sanitizeHtml(tidyDashes(post.content)) : ""),
    [post],
  );

  if (post === undefined) {
    return (
      <SecondaryPage maxWidthClass="max-w-4xl">
        <PostSkeleton />
      </SecondaryPage>
    );
  }

  if (post === null) {
    return (
      <SecondaryPage maxWidthClass="max-w-4xl">
        <Seo path="/blog" title="Post not found | ATLAS Blog" index={false} />
        <EmptyState
          icon={PenLine}
          eyebrow="404"
          title="Post not found"
          description="This article does not exist or is no longer published."
        />
        <div className="mt-8 flex justify-center">
          <CurtainLink
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm text-white/80 transition-colors hover:border-[#cf9eff]/50 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to blog
          </CurtainLink>
        </div>
      </SecondaryPage>
    );
  }

  const minutes = readingTimeMinutes(post.content);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(post.title);
  const shareLinks = {
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  } as const;
  const openShare = (href: string) =>
    window.open(href, "_blank", "noopener,noreferrer");

  return (
    <SecondaryPage maxWidthClass="max-w-4xl">
      <Seo
        path={`/blog/${post.slug}`}
        title={`${post.title} | ATLAS Blog`}
        description={post.excerpt}
      />

      <Reveal>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-white/45">
            <li>
              <CurtainLink to="/" className="transition-colors hover:text-white/80">
                Home
              </CurtainLink>
            </li>
            <li aria-hidden className="flex items-center gap-2">
              <ChevronRight className="size-3.5" />
              <CurtainLink to="/blog" className="transition-colors hover:text-white/80">
                Blog
              </CurtainLink>
            </li>
            <li aria-hidden className="flex min-w-0 items-center gap-2">
              <ChevronRight className="size-3.5 shrink-0" />
              <span className="truncate text-white/70">{post.title}</span>
            </li>
          </ol>
        </nav>
      </Reveal>

      <Reveal delay={0.08}>
        <header className="relative mt-6 overflow-hidden rounded-3xl border border-white/10">
          <div className="relative h-[380px] w-full sm:h-[460px]">
            {post.cover_image_url ? (
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
                width={1200}
                height={630}
                loading="eager"
                decoding="async"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith("/fallback-blog.svg")) {
                    img.src = "/fallback-blog.svg";
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_15%,rgba(207,158,255,0.28),transparent_75%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-semibold tracking-[0.22em] text-white/85 uppercase backdrop-blur-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="mt-4 text-3xl leading-[1.1] font-bold tracking-[-0.03em] text-white sm:text-4xl lg:text-[2.75rem]">
                {post.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/55">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-[#cf9eff]/80" />
                  {formatPostDate(post.published_at)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="size-4 text-[#cf9eff]/80" />
                  {minutes} min read
                </span>
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-8 flex justify-start">
          <CurtainLink
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm text-white/80 transition-colors hover:border-[#cf9eff]/50 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Back to blog
          </CurtainLink>
        </div>
      </Reveal>

      <article>
        <Reveal delay={0.16}>
          <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: html }} />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <p className="text-[11px] font-medium tracking-[0.3em] text-white/45 uppercase">
              Share this article
            </p>
            <div className="flex items-center gap-3">
              {(
                [
                  ["X", SHARE_PATHS.x, shareLinks.x],
                  ["LinkedIn", SHARE_PATHS.linkedin, shareLinks.linkedin],
                  ["Facebook", SHARE_PATHS.facebook, shareLinks.facebook],
                ] as const
              ).map(([label, path, href]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`Share on ${label}`}
                  onClick={() => openShare(href)}
                  className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/70 transition-all duration-300 hover:border-[#cf9eff]/60 hover:bg-[#cf9eff]/15 hover:text-[#cf9eff]"
                >
                  <ShareIcon path={path} />
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-star/50 bg-star/15 shadow-[0_0_24px_rgba(157,180,255,0.35)]">
                <span className="size-3 rotate-45 rounded-[2px] border border-star/90 bg-star/40" />
              </span>
              <div>
                <p className="text-[11px] font-medium tracking-[0.3em] text-white/45 uppercase">
                  Written by
                </p>
                <p className="mt-1 text-lg font-semibold text-white">ATLAS Team</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/55">
              We build ATLAS, the AI learning OS that turns one goal into a
              step-by-step plan with roadmaps, quizzes, notes and focus sessions
              in one place. We write about learning systems, study craft and the
              AI tools worth your time.
            </p>
            <div className="mt-6">
              <CurtainLink
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#7c5cff] to-[#5b47d4] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_34px_-8px_rgba(207,158,255,0.6)] transition-all hover:from-[#8f77ff] hover:to-[#6a55e0]"
              >
                Start learning with ATLAS
              </CurtainLink>
            </div>
          </section>
        </Reveal>
      </article>

      {related.length > 0 && (
        <section className="mt-16">
          <Reveal>
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl">
              Related articles
            </h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, index) => (
              <Reveal key={item.id} delay={Math.min(index * 0.06, 0.2)} className="h-full">
                <BlogCard post={item} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </SecondaryPage>
  );
}
