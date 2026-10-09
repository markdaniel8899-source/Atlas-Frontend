import { ArrowUpRight } from "lucide-react";
import { CurtainLink } from "../PageCurtain";
import { type BlogPost } from "../../lib/blog";

const FALLBACK_IMAGE = "/fallback-blog.svg";

function CoverImage({
  post,
  priority,
  className,
}: {
  post: BlogPost;
  priority: boolean;
  className: string;
}) {
  if (!post.cover_image_url) {
    return (
      <div
        className={`bg-[radial-gradient(70%_60%_at_50%_20%,rgba(207,158,255,0.25),transparent_70%)] ${className}`}
      />
    );
  }
  return (
    <img
      src={post.cover_image_url}
      alt={post.title}
      loading={priority ? "eager" : "lazy"}
      width={1200}
      height={800}
      decoding="async"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
      }}
      className={className}
    />
  );
}

/** MITRAVEL-style card: 100% image with text + arrow floating OVER it.
 *  `variant` carries the grid span classes (col-span/row-span).
 *  `stacked` renders a classic card instead: image on top, heading below. */
export function BlogCard({
  post,
  priority = false,
  variant = "",
  stacked = false,
}: {
  post: BlogPost;
  priority?: boolean;
  variant?: string;
  /** Classic card: image on top, heading in a separate section below. */
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <CurtainLink
        to={`/blog/${post.slug}`}
        className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 ${variant}`}
      >
        <div className="aspect-video w-full shrink-0 overflow-hidden">
          <CoverImage
            post={post}
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col p-4 md:p-5">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-white md:text-base">
            {post.title}
          </h3>
        </div>
      </CurtainLink>
    );
  }

  const tag = (post.tags[0] || "ARTICLE").toUpperCase();

  return (
    <CurtainLink
      to={`/blog/${post.slug}`}
      className={`group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl ${variant}`}
    >
      {/* 1. Background image fills the entire card */}
      <CoverImage
        post={post}
        priority={priority}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* 2. Dark gradient overlay, bottom to top, for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* 3. Text content, bottom left, OVER the image — tag + title only */}
      <div className="absolute bottom-0 left-0 z-10 max-w-[85%] p-6 md:p-8">
        <span className="mb-2 block text-[10px] font-bold tracking-widest text-white/70 uppercase md:text-xs">
          {tag}
        </span>
        <h3 className="line-clamp-2 text-lg leading-tight font-bold text-white drop-shadow-md md:text-xl lg:text-2xl">
          {post.title}
        </h3>
      </div>

      {/* 4. Arrow button, bottom right, OVER the image */}
      <div className="absolute right-6 bottom-6 z-10 md:right-8 md:bottom-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-black md:h-10 md:w-10">
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </CurtainLink>
  );
}

export function BlogCardSkeleton({ variant = "" }: { variant?: string }) {
  return (
    <div
      className={`h-full w-full animate-pulse overflow-hidden rounded-2xl bg-white/[0.06] ${variant}`}
    />
  );
}
