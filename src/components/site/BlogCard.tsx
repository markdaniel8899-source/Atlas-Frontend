import { ArrowUpRight } from "lucide-react";
import { CurtainLink } from "../PageCurtain";
import {
  formatPostDate,
  readingTimeMinutes,
  type BlogPost,
} from "../../lib/blog";

const FALLBACK_IMAGE = "/fallback-blog.svg";

export type BlogCardVariant = "default" | "featured" | "wide";

export function BlogCard({
  post,
  priority = false,
  variant = "default",
}: {
  post: BlogPost;
  priority?: boolean;
  variant?: BlogCardVariant;
}) {
  const minutes = readingTimeMinutes(post.content);
  const tag = post.tags[0];
  const shortExcerpt = post.excerpt
    ? post.excerpt.length > 120
      ? `${post.excerpt.slice(0, 120).trimEnd()}...`
      : post.excerpt
    : "";

  const isFeatured = variant === "featured";
  const isWide = variant === "wide";

  return (
    <CurtainLink
      to={`/blog/${post.slug}`}
      className={`group flex h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 ${
        isWide ? "flex-col sm:flex-row" : "flex-col"
      }`}
    >
      <div
        className={`w-full shrink-0 overflow-hidden ${
          isWide
            ? "aspect-video sm:aspect-auto sm:w-1/2 sm:self-stretch"
            : isFeatured
              ? "aspect-video lg:aspect-auto lg:min-h-[16rem] lg:flex-1"
              : "aspect-video"
        }`}
      >
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading={priority ? "eager" : "lazy"}
            width={800}
            height={450}
            decoding="async"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(70%_60%_at_50%_20%,rgba(207,158,255,0.2),transparent_70%)]" />
        )}
      </div>
      <div
        className={`flex flex-1 flex-col p-6 ${isWide ? "sm:w-1/2 sm:justify-center" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] tracking-[0.18em] text-white/45 uppercase">
          {tag && (
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold tracking-[0.22em] text-white/85">
              {tag}
            </span>
          )}
          <span>
            {formatPostDate(post.published_at)} · {minutes} min read
          </span>
        </div>
        <h2
          className={`mt-3 line-clamp-2 font-semibold tracking-[-0.02em] text-white ${
            isFeatured ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {post.title}
        </h2>
        {shortExcerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-gray-400">
            {shortExcerpt}
          </p>
        )}
        <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-white/60 transition-colors duration-300 group-hover:text-[#cf9eff]">
          Read article
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </CurtainLink>
  );
}

export function BlogCardSkeleton() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="aspect-video w-full animate-pulse bg-white/[0.06]" />
      <div className="flex flex-1 flex-col p-6">
        <div className="h-3 w-28 rounded-full bg-white/[0.07]" />
        <div className="mt-4 h-5 w-3/4 rounded-full bg-white/[0.09]" />
        <div className="mt-3 h-4 w-full rounded-full bg-white/[0.06]" />
        <div className="mt-2 h-4 w-5/6 rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}
