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
          Notes on learning, focus and craft from the ATLAS team — plus fresh
          takes on the AI tools reshaping how students study.
        </p>
      </Reveal>

      <div className="mt-12 sm:mt-14">
        {posts === null ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <BlogCardSkeleton featured />
            <BlogCardSkeleton />
            <BlogCardSkeleton />
            <BlogCardSkeleton />
            <BlogCardSkeleton />
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {posts.map((post, index) => (
              <Reveal
                key={post.id}
                delay={Math.min(index * 0.06, 0.3)}
                className={index === 0 ? "sm:col-span-2 lg:row-span-2" : ""}
              >
                <BlogCard post={post} featured={index === 0} priority={index === 0} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </SecondaryPage>
  );
}
