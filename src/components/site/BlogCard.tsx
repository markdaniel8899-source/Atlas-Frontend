import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { CurtainLink } from "../PageCurtain";
import {
  formatPostDate,
  readingTimeMinutes,
  type BlogPost,
} from "../../lib/blog";

const FEATURED_FRAME =
  "aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[30rem]";

export function BlogCard({
  post,
  featured = false,
  priority = false,
}: {
  post: BlogPost;
  featured?: boolean;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const minutes = readingTimeMinutes(post.content);
  const tag = post.tags[0];
  const shortExcerpt = post.excerpt
    ? post.excerpt.length > 120
      ? `${post.excerpt.slice(0, 120).trimEnd()}...`
      : post.excerpt
    : "";

  return (
    <CurtainLink
      to={`/blog/${post.slug}`}
      className={`group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-white/25 hover:shadow-[0_36px_90px_-32px_rgba(207,158,255,0.4)] ${
        featured ? "h-full sm:col-span-2 lg:row-span-2" : ""
      }`}
    >
      <div
        className={`relative w-full overflow-hidden ${
          featured ? FEATURED_FRAME : "aspect-video"
        }`}
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-white/[0.06]" />
        )}
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.04] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(207,158,255,0.25),transparent_70%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/55 to-transparent" />

        {tag && (
          <span className="absolute top-4 right-4 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-semibold tracking-[0.22em] text-white/85 uppercase backdrop-blur-md">
            {tag}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.18em] text-white/45 uppercase">
              {formatPostDate(post.published_at)} · {minutes} min read
            </p>
            <h2
              className={`mt-2 font-semibold tracking-[-0.02em] text-white ${
                featured
                  ? "text-xl sm:text-2xl lg:text-3xl"
                  : "line-clamp-2 text-lg"
              }`}
            >
              {post.title}
            </h2>
            {featured && shortExcerpt && (
              <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/55">
                {shortExcerpt}
              </p>
            )}
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur-md transition-all duration-300 group-hover:border-[#cf9eff]/60 group-hover:bg-[#cf9eff]/20 group-hover:text-[#cf9eff]">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </CurtainLink>
  );
}

export function BlogCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] ${
        featured ? "sm:col-span-2 lg:row-span-2" : ""
      }`}
    >
      <div
        className={`relative w-full ${
          featured ? FEATURED_FRAME : "aspect-video"
        }`}
      >
        <div className="absolute inset-0 animate-pulse bg-white/[0.05]" />
        <div className="absolute inset-x-5 bottom-5 space-y-3">
          <div className="h-3 w-28 rounded-full bg-white/[0.07]" />
          <div className="h-5 w-3/4 rounded-full bg-white/[0.09]" />
        </div>
      </div>
    </div>
  );
}
