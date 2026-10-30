import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Eye,
  Loader2,
  PenLine,
  Rocket,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  deleteAdminPost,
  fetchAdminPosts,
  type AdminPost,
} from "../../lib/admin";
import {
  fetchPostPreview,
  publishPost,
  rebuildSite,
  unpublishPost,
  type AdminPostPreview,
} from "../../lib/blogAdmin";
import { toast } from "../../lib/toast";
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonRows,
  formatDate,
  formatDateTime,
} from "./ui";
import {
  PostPreviewDialog,
  ScoreBadge,
  StatusPill,
} from "./blogUi";

type Status = "loading" | "ready" | "error";
type Action = "publish" | "unpublish" | "delete" | "preview";
type Filter = "all" | "published" | "draft";

interface Busy {
  id: string;
  action: Action;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function Posts() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Busy | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [preview, setPreview] = useState<AdminPostPreview | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      setPosts(await fetchAdminPosts());
      setStatus("ready");
    } catch (e) {
      setError(messageOf(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isBusy = (post: AdminPost, action: Action) =>
    busy?.id === post.id && busy.action === action;

  const onPreview = async (post: AdminPost) => {
    setBusy({ id: post.id, action: "preview" });
    try {
      setPreview(await fetchPostPreview(post.id));
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const onPublish = async (post: AdminPost) => {
    setBusy({ id: post.id, action: "publish" });
    try {
      const result = await publishPost(post.id);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, publishedAt: new Date().toISOString() }
            : item,
        ),
      );
      if (result.deploy?.triggered) {
        toast.success(`Published "${post.title}" and triggered a rebuild.`);
      } else {
        toast.success(
          `Published "${post.title}". Rebuild manually to expose it on the static blog.`,
        );
      }
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const onUnpublish = async (post: AdminPost) => {
    const ok = window.confirm(
      `Unpublish "${post.title}"? The public page will disappear after the next rebuild.`,
    );
    if (!ok) return;
    setBusy({ id: post.id, action: "unpublish" });
    try {
      const result = await unpublishPost(post.id);
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id ? { ...item, publishedAt: null } : item,
        ),
      );
      if (result.deploy?.triggered) {
        toast.success(`Unpublished "${post.title}" and triggered a rebuild.`);
      } else {
        toast.success(`Unpublished "${post.title}". Rebuild manually.`);
      }
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (post: AdminPost) => {
    const ok = window.confirm(
      `Delete "${post.title}"? This cannot be undone.`,
    );
    if (!ok) return;

    setBusy({ id: post.id, action: "delete" });
    try {
      await deleteAdminPost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success(`Deleted "${post.title}".`);
      if (post.publishedAt) {
        try {
          const result = await rebuildSite();
          if (!result.triggered) {
            toast.info("Post deleted; rebuild the site to refresh the blog.");
          }
        } catch {
          toast.info("Post deleted; rebuild the site to refresh the blog.");
        }
      }
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setBusy(null);
    }
  };

  const onRebuild = async () => {
    setRebuilding(true);
    try {
      const result = await rebuildSite();
      if (result.triggered) toast.success("Vercel deploy hook triggered.");
      else toast.error(result.error ?? "The deploy hook was not triggered.");
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setRebuilding(false);
    }
  };

  const visible = posts.filter((post) => {
    if (filter === "published") return Boolean(post.publishedAt);
    if (filter === "draft") return !post.publishedAt;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Posts
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {status === "ready"
              ? `${posts.length} article${posts.length === 1 ? "" : "s"} · ${
                  posts.filter((post) => post.publishedAt).length
                } published`
              : "Review, preview and publish AutoBlog drafts."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/wp-admin/pipeline"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-[#cf9eff]/40 hover:text-white"
          >
            <PenLine className="size-3.5" />
            Pipeline
          </Link>
          <button
            type="button"
            onClick={() => void onRebuild()}
            disabled={rebuilding}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-[#cf9eff]/40 hover:text-white disabled:opacity-50"
          >
            {rebuilding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Rocket className="size-3.5" />
            )}
            Rebuild site
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["all", "All"],
            ["published", "Published"],
            ["draft", "Drafts"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === value
                ? "border-[#cf9eff]/35 bg-[#cf9eff]/10 text-[#e4ccff]"
                : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {status === "loading" && <SkeletonRows rows={6} />}
        {status === "error" && <ErrorState message={error} onRetry={load} />}
        {status === "ready" && visible.length === 0 && (
          <EmptyState
            message={
              posts.length === 0
                ? "No posts found. Start the pipeline to generate the first draft."
                : "No posts match this filter."
            }
          />
        )}

        {status === "ready" && visible.length > 0 && (
          <>
            <table className="hidden w-full text-left text-sm lg:table">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-gray-500">
                  <th className="px-4 py-3 font-medium">Article</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">SEO</th>
                  <th className="px-4 py-3 font-medium">Words</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="max-w-sm px-4 py-3">
                      <p className="truncate font-medium text-white">
                        {post.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">
                        {post.metaTitle || `/blog/${post.slug}`}
                      </p>
                      {post.pipelineRunId && (
                        <Link
                          to={`/wp-admin/pipeline?run=${post.pipelineRunId}`}
                          className="mt-1 inline-block text-[10px] text-[#cf9eff]/80 hover:text-[#cf9eff]"
                        >
                          Track pipeline run
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={post.publishedAt ? "completed" : "draft"}
                      />
                      <p className="mt-1 text-[10px] text-gray-500">
                        {post.publishedAt
                          ? formatDate(post.publishedAt)
                          : "Not published"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={post.seoScore} />
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-gray-400">
                      {post.wordCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDateTime(post.updatedAt || post.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void onPreview(post)}
                          disabled={busy?.id === post.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-gray-300 transition-colors hover:text-white disabled:opacity-50"
                        >
                          {isBusy(post, "preview") ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Eye className="size-3" />
                          )}
                          Preview
                        </button>
                        {post.publishedAt ? (
                          <>
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-gray-300 transition-colors hover:text-white"
                            >
                              <ExternalLink className="size-3" />
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => void onUnpublish(post)}
                              disabled={busy?.id === post.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200 transition-colors hover:border-amber-400/40 disabled:opacity-50"
                            >
                              {isBusy(post, "unpublish") ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Undo2 className="size-3" />
                              )}
                              Unpublish
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void onPublish(post)}
                            disabled={busy?.id === post.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-200 transition-colors hover:border-emerald-400/40 disabled:opacity-50"
                          >
                            {isBusy(post, "publish") ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Send className="size-3" />
                            )}
                            Publish
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void onDelete(post)}
                          disabled={busy?.id === post.id}
                          aria-label={`Delete ${post.title}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          {isBusy(post, "delete") ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-white/[0.06] lg:hidden">
              {visible.map((post) => (
                <li key={post.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {post.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">
                        /blog/{post.slug}
                      </p>
                      {post.pipelineRunId && (
                        <Link
                          to={`/wp-admin/pipeline?run=${post.pipelineRunId}`}
                          className="mt-1 inline-block text-[10px] text-[#cf9eff]/80"
                        >
                          Track pipeline run
                        </Link>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill
                        status={post.publishedAt ? "completed" : "draft"}
                      />
                      <ScoreBadge score={post.seoScore} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
                    <span>
                      {post.wordCount ? `${post.wordCount} words` : "Words pending"}
                    </span>
                    <span>
                      {post.publishedAt
                        ? `Published ${formatDate(post.publishedAt)}`
                        : "Draft"}
                    </span>
                    <span>
                      Updated {formatDateTime(post.updatedAt || post.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void onPreview(post)}
                      disabled={busy?.id === post.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-gray-300 disabled:opacity-50"
                    >
                      <Eye className="size-3" />
                      Preview
                    </button>
                    {post.publishedAt ? (
                      <>
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-gray-300"
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => void onUnpublish(post)}
                          disabled={busy?.id === post.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200 disabled:opacity-50"
                        >
                          <Undo2 className="size-3" />
                          Unpublish
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onPublish(post)}
                        disabled={busy?.id === post.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-200 disabled:opacity-50"
                      >
                        <Send className="size-3" />
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onDelete(post)}
                      disabled={busy?.id === post.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-300 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <PostPreviewDialog post={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
