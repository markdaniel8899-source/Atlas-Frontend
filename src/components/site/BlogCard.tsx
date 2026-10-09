import { ArrowUpRight } from "lucide-react";
import { CurtainLink } from "../PageCurtain";
import { type BlogPost } from "../../lib/blog";

const FALLBACK_IMAGE = "/fallback-blog.svg";

/** MITRAVEL-style card: 100% image with text + arrow floating OVER it.
 *  `variant` carries the grid span classes (col-span/row-span). */
export function BlogCard({
  post,
  priority = false,
  variant = "",
  minimal = false,
}: {
  post: BlogPost;
  priority?: boolean;
  variant?: string;
  /** Image + title only (no tag, no arrow) — for related-articles cards. */
  minimal?: boolean;
}) {
  const tag = (post.tags[0] || "ARTICLE").toUpperCase();

  return (
    <CurtainLink
      to={`/blog/${post.slug}`}
      className={`group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl ${variant}`}
    >
      {/* 1. Background image fills the entire card */}
      {post.cover_image_url ? (
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
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_20%,rgba(207,158,255,0.25),transparent_70%)]" />
      )}

      {/* 2. Dark gradient overlay, bottom to top, for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* 3. Text content, bottom left, OVER the image — tag + title only */}
      <div className="absolute bottom-0 left-0 z-10 max-w-[85%] p-6 md:p-8">
        {!minimal && (
          <span className="mb-2 block text-[10px] font-bold tracking-widest text-white/70 uppercase md:text-xs">
            {tag}
          </span>
        )}
        <h3 className="line-clamp-2 text-lg leading-tight font-bold text-white drop-shadow-md md:text-xl lg:text-2xl">
          {post.title}
        </h3>
      </div>

      {/* 4. Arrow button, bottom right, OVER the image */}
      {!minimal && (
        <div className="absolute right-6 bottom-6 z-10 md:right-8 md:bottom-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-black md:h-10 md:w-10">
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
      )}
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
