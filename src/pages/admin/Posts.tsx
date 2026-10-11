import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  deleteAdminPost,
  fetchAdminPosts,
  type AdminPost,
} from "../../lib/admin";
import { toast } from "../../lib/toast";
import { Card, EmptyState, ErrorState, SkeletonRows, formatDate } from "./ui";

type Status = "loading" | "ready" | "error";

export default function Posts() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      setPosts(await fetchAdminPosts());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load posts.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (post: AdminPost) => {
    const ok = window.confirm(
      `Delete "${post.title}"? This cannot be undone.`,
    );
    if (!ok) return;

    setDeletingId(post.id);
    try {
      await deleteAdminPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success(`Deleted "${post.title}".`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  };

  const viewUrl = (slug: string) => `/blog/${slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Posts
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          {status === "ready"
            ? `${posts.length} article${posts.length === 1 ? "" : "s"}`
            : "Review and manage blog articles."}
        </p>
      </div>

      <Card className="overflow-hidden">
        {status === "loading" && <SkeletonRows rows={6} />}
        {status === "error" && <ErrorState message={error} onRetry={load} />}
        {status === "ready" && posts.length === 0 && (
          <EmptyState message="No posts found." />
        )}

        {status === "ready" && posts.length > 0 && (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Author</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="max-w-xs px-5 py-3">
                      <p className="truncate font-medium text-white">
                        {post.title}
                      </p>
                      {!post.publishedAt && (
                        <span className="mt-0.5 inline-block rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {post.tags[0] ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-400">ATLAS AI</td>
                    <td className="px-5 py-3 text-gray-400">
                      {formatDate(post.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={viewUrl(post.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-white/25 hover:text-white"
                        >
                          <ExternalLink className="size-3.5" />
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => void onDelete(post)}
                          disabled={deletingId === post.id}
                          aria-label={`Delete ${post.title}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          {deletingId === post.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {posts.map((post) => (
                <li key={post.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {post.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {post.tags[0] ?? "Uncategorised"} ·{" "}
                        {formatDate(post.createdAt)}
                      </p>
                    </div>
                    {!post.publishedAt && (
                      <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={viewUrl(post.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-white/25 hover:text-white"
                    >
                      <ExternalLink className="size-3.5" />
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => void onDelete(post)}
                      disabled={deletingId === post.id}
                      aria-label={`Delete ${post.title}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
