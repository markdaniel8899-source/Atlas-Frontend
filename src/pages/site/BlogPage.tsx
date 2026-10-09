import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import {
  SecondaryPage,
  PAGE_H1,
  PAGE_LEAD,
} from "../../components/site/SecondaryPage";
import {
  BlogCard,
  BlogCardSkeleton,
} from "../../components/site/BlogCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Reveal } from "../../components/site/Reveal";
import { fetchPosts, type BlogPost } from "../../lib/blog";

const BLOG_GRID =
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[240px] md:auto-rows-[260px] grid-flow-row-dense";

/** MITRAVEL reference layout: featured = wide 1-row banner, first vertical
 *  card sits on the LEFT and spans 3 rows (taller than before). */
function gridSpan(index: number): string {
  if (index === 0) return "col-span-1 md:col-span-2"; // Featured: 2 cols, 1 row
  if (index === 2) return "row-span-3"; // Left vertical: 1 col, 3 rows (tall)
  if (index === 3) return "col-span-1 md:col-span-2"; // Wide horizontal
  return "col-span-1 row-span-1"; // Normal square
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPosts(12)
      .then((rows) => {
        if (!cancelled) setPosts(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setPosts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SecondaryPage maxWidthClass="max-w-6xl">
      <Reveal>
        <p className="text-[11px] font-medium tracking-[0.4em] text-star/70 uppercase">
          Blog
        </p>
        <h1 className={`${PAGE_H1} mt-4`}>Latest Articles</h1>
        <p className={PAGE_LEAD}>
          Notes on learning, focus and craft from the ATLAS team, plus fresh
          takes on the AI tools reshaping how students study.
        </p>
      </Reveal>

      <div className="mt-12 sm:mt-14">
        {posts === null ? (
          <div className={BLOG_GRID}>
            {Array.from({ length: 6 }, (_, i) => (
              <BlogCardSkeleton key={i} variant={gridSpan(i)} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          failed ? (
            <EmptyState
              icon={PenLine}
              eyebrow="Offline"
              title="Could not load posts"
              description="The articles could not be fetched right now. Refresh the page to try again."
            />
          ) : (
            <EmptyState
              icon={PenLine}
              eyebrow="Coming soon"
              title="No posts yet"
              description="Notes on learning, focus and craft will live here. The first posts are on the way."
            />
          )
        ) : (
          <div className={BLOG_GRID}>
            {posts.map((post, index) => (
              <Reveal
                key={post.id}
                delay={Math.min(index * 0.06, 0.3)}
                className={gridSpan(index)}
              >
                <BlogCard
                  post={post}
                  priority={index === 0}
                  variant="h-full w-full"
                />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </SecondaryPage>
  );
}
