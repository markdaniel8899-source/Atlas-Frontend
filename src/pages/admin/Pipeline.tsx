import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ExternalLink,
  Eye,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
} from "lucide-react";
import {
  fetchPipelineRun,
  fetchPipelineRuns,
  fetchPipelineStatus,
  fetchPostPreview,
  rebuildSite,
  triggerPipeline,
  type AdminPostPreview,
  type PipelineRun,
  type PipelineRunDetail,
} from "../../lib/blogAdmin";
import { toast } from "../../lib/toast";
import {
  Card,
  EmptyState,
  ErrorState,
  SkeletonRows,
  formatDateTime,
  formatDuration,
  relativeTime,
} from "./ui";
import {
  GateReportPanel,
  PostPreviewDialog,
  ProviderSummary,
  ScoreBadge,
  StagePill,
  StatusPill,
} from "./blogUi";

type LoadState = "loading" | "ready" | "error";

function runDuration(run: PipelineRun): string {
  const start = new Date(run.started_at).getTime();
  if (Number.isNaN(start)) return "—";
  const end = run.finished_at ? new Date(run.finished_at).getTime() : Date.now();
  if (Number.isNaN(end)) return "—";
  return formatDuration(Math.max(0, end - start));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function PipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRun = searchParams.get("run");
  const [active, setActive] = useState<PipelineRun | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PipelineRunDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [preview, setPreview] = useState<AdminPostPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const [status, history] = await Promise.all([
        fetchPipelineStatus(),
        fetchPipelineRuns(30),
      ]);
      setActive(status.run);
      setRuns(history.items);
      setError("");
      setState("ready");
    } catch (e) {
      setError(messageOf(e));
      setState((prev) => (prev === "ready" ? "ready" : "error"));
    }
  }, []);

  const loadDetail = useCallback(async (runId: string, silent = false) => {
    if (!silent) setDetailLoading(true);
    try {
      const next = await fetchPipelineRun(runId);
      setDetail(next);
    } catch (e) {
      if (!silent) toast.error(messageOf(e));
    } finally {
      if (!silent) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // A linked run from Posts wins; otherwise select a new live run once and
  // leave manual history choices alone.
  useEffect(() => {
    if (requestedRun) {
      setSelectedId(requestedRun);
      return;
    }
    if (!selectedId && active?.id) setSelectedId(active.id);
  }, [requestedRun, active?.id, selectedId]);

  useEffect(() => {
    if (!selectedId && runs[0]?.id) setSelectedId(runs[0].id);
  }, [selectedId, runs]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const liveStatus = active?.status ?? detail?.run.status;
  useEffect(() => {
    if (liveStatus !== "running") return;
    const id = window.setInterval(() => {
      void loadOverview();
      if (selectedId) void loadDetail(selectedId, true);
    }, 3000);
    return () => window.clearInterval(id);
  }, [liveStatus, selectedId, loadOverview, loadDetail]);

  const startRun = async () => {
    setStarting(true);
    try {
      const result = await triggerPipeline("admin");
      toast.success("Blog pipeline started.");
      setSearchParams({}, { replace: true });
      setSelectedId(result.run_id);
      await loadOverview();
      await loadDetail(result.run_id);
    } catch (e) {
      toast.error(messageOf(e));
      await loadOverview();
    } finally {
      setStarting(false);
    }
  };

  const onRebuild = async () => {
    setDeploying(true);
    try {
      const result = await rebuildSite();
      if (result.triggered) {
        toast.success("Vercel deploy hook triggered.");
      } else {
        toast.error(result.error ?? "The deploy hook was not triggered.");
      }
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setDeploying(false);
    }
  };

  const openPreview = async (postId: string | null) => {
    if (!postId) {
      toast.info("This run has no post to preview.");
      return;
    }
    setPreviewLoading(true);
    try {
      setPreview(await fetchPostPreview(postId));
    } catch (e) {
      toast.error(messageOf(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const latest = active ?? runs[0] ?? null;
  const runDetail = detail?.run.id === selectedId ? detail : null;
  const selectedRun = runDetail?.run ?? runs.find((run) => run.id === selectedId);
  const steps = runDetail?.steps ?? [];
  const postId = runDetail?.post?.id ?? selectedRun?.post_id ?? null;
  const postSlug = runDetail?.post?.slug ?? null;
  const isRunning = latest?.status === "running";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            AutoBlog Pipeline
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Trigger a run, watch each stage, inspect the editorial gate, and
            rebuild the public site after publishing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-white/25 hover:text-white"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void onRebuild()}
            disabled={deploying}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-[#cf9eff]/40 hover:text-white disabled:opacity-50"
          >
            {deploying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Rocket className="size-3.5" />
            )}
            Rebuild site
          </button>
          <button
            type="button"
            onClick={() => void startRun()}
            disabled={starting || isRunning}
            className="inline-flex items-center gap-2 rounded-lg border border-[#cf9eff]/30 bg-gradient-to-r from-[#4044cc]/45 to-[#cf9eff]/25 px-3 py-2 text-xs font-semibold text-white shadow-[0_0_24px_-10px_rgba(207,158,255,0.7)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting || isRunning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            {isRunning ? "Run in progress" : "Run now"}
          </button>
        </div>
      </div>

      {error && state === "ready" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/85">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error} Retrying will not stop an in-flight run.</span>
        </div>
      )}

      {state === "error" ? (
        <Card>
          <ErrorState message={error} onRetry={() => void loadOverview()} />
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  {active ? "Live run" : "Latest run"}
                </p>
                {latest && <StatusPill status={latest.status} />}
                {latest && <StagePill stage={latest.current_stage} />}
              </div>
              {latest && (
                <p className="text-[11px] text-gray-500">
                  Started {relativeTime(latest.started_at)} · {runDuration(latest)}
                </p>
              )}
            </div>

            {state === "loading" ? (
              <SkeletonRows rows={3} />
            ) : latest ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Trigger
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-200">
                      {latest.trigger}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Gate score
                    </p>
                    <div className="mt-1">
                      <ScoreBadge score={latest.score} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Words
                    </p>
                    <p className="mt-1 text-sm font-medium tabular-nums text-gray-200">
                      {latest.word_count ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Started
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-gray-200">
                      {formatDateTime(latest.started_at)}
                    </p>
                  </div>
                </div>

                {latest.error && (
                  <p className="rounded-lg border border-rose-400/15 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200/80">
                    {latest.error}
                  </p>
                )}

                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Providers
                  </p>
                  <ProviderSummary summary={latest.provider_summary} />
                </div>

                {latest.post_id && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      onClick={() => void openPreview(latest.post_id)}
                      disabled={previewLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:text-white disabled:opacity-50"
                    >
                      <Eye className="size-3.5" />
                      Preview draft
                    </button>
                    {postSlug &&
                      latest.id === runDetail?.run.id &&
                      runDetail?.post?.published_at && (
                        <a
                          href={`/blog/${postSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:text-white"
                        >
                          <ExternalLink className="size-3.5" />
                          View post
                        </a>
                      )}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="No pipeline runs yet. Start one with Run now." />
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                <p className="text-sm font-semibold text-white">Run history</p>
                <span className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
                  {runs.length} run{runs.length === 1 ? "" : "s"}
                </span>
              </div>
              {runs.length === 0 ? (
                <EmptyState message="Run history is empty." />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {runs.map((run) => (
                    <li key={run.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(run.id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${
                          selectedId === run.id ? "bg-white/[0.045]" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={run.status} />
                            <span className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
                              {run.trigger}
                            </span>
                            <StagePill stage={run.current_stage} />
                          </div>
                          <p className="mt-1.5 truncate text-xs text-gray-400">
                            {formatDateTime(run.started_at)} ·{" "}
                            {runDuration(run)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <ScoreBadge score={run.score} />
                          <p className="mt-1 text-[10px] text-gray-500">
                            {run.word_count ? `${run.word_count} words` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    Stage timeline
                  </p>
                  {selectedRun && <StatusPill status={selectedRun.status} />}
                </div>
                {detailLoading && !runDetail ? (
                  <SkeletonRows rows={5} />
                ) : !selectedRun ? (
                  <EmptyState message="Select a run to inspect its stages." />
                ) : (
                  <div className="mt-4 space-y-2">
                    {steps.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No stage records yet.
                      </p>
                    ) : (
                      steps.map((step) => (
                        <div
                          key={step.id}
                          className="rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={step.status} />
                            <span className="font-mono text-xs text-gray-200">
                              {step.stage}
                            </span>
                            {step.attempt > 1 && (
                              <span className="text-[10px] text-gray-500">
                                attempt {step.attempt}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] tabular-nums text-gray-500">
                              {formatDuration(step.duration_ms)}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-gray-500">
                            {step.provider ?? "local"}
                            {step.model ? ` · ${step.model}` : ""}
                            {step.created_at
                              ? ` · ${formatDateTime(step.created_at)}`
                              : ""}
                          </p>
                          {step.error && (
                            <p className="mt-1 text-[11px] text-rose-300/80">
                              {step.error}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <p className="mb-4 text-sm font-semibold text-white">
                  Editorial gate
                </p>
                {detailLoading && !runDetail ? (
                  <SkeletonRows rows={4} />
                ) : (
                  <GateReportPanel report={runDetail?.gate_report} />
                )}
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Draft preview
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Stored content, independent of the public post renderer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openPreview(postId)}
                    disabled={!postId || previewLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {previewLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                    Preview
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <PostPreviewDialog post={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
