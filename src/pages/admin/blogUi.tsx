import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import { sanitizeHtml } from "../../lib/notes";
import type { AdminPostPreview } from "../../lib/blogAdmin";
import { formatDateTime } from "./ui";

const STATUS_STYLES: Record<string, string> = {
  running: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  started: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  completed: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  failed: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  cancelled: "border-white/15 bg-white/5 text-gray-400",
  skipped: "border-white/15 bg-white/5 text-gray-500",
  draft: "border-white/15 bg-white/5 text-gray-400",
};

export function StatusPill({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        STATUS_STYLES[status] ?? "border-white/15 bg-white/5 text-gray-400"
      } ${className}`}
    >
      {(status === "running" || status === "started") && (
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
      )}
      {status}
    </span>
  );
}

export function StagePill({ stage }: { stage: string | null }) {
  if (!stage) return null;
  return (
    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-gray-400">
      {stage}
    </span>
  );
}

export function ScoreBadge({
  score,
  className = "",
}: {
  score: number | null | undefined;
  className?: string;
}) {
  if (score == null) {
    return <span className={`text-xs text-gray-600 ${className}`}>—</span>;
  }
  const tone =
    score >= 90
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
      : score >= 70
        ? "border-amber-400/25 bg-amber-500/10 text-amber-300"
        : "border-rose-400/25 bg-rose-500/10 text-rose-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${tone} ${className}`}
    >
      {score}
    </span>
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function ProviderSummary({
  summary,
}: {
  summary: Record<string, unknown> | null | undefined;
}) {
  const entries = Object.entries(summary ?? {});
  if (!entries.length) {
    return <span className="text-xs text-gray-600">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([stage, raw]) => {
        if (Array.isArray(raw)) {
          const attempts = raw.flatMap((item) => {
            const row = asRecord(item);
            return row ? [row] : [];
          });
          const latest = attempts[attempts.length - 1];
          const provider = latest?.provider ? String(latest.provider) : "local";
          const model = latest?.model ? String(latest.model) : "";
          return (
            <span
              key={stage}
              title={model || provider}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-gray-400"
            >
              {stage}: {provider}
              {attempts.length > 1 ? ` · ${attempts.length} tries` : ""}
            </span>
          );
        }
        const record = asRecord(raw);
        const suffix = record?.triggered
          ? "triggered"
          : record?.fallback
            ? "fallback"
            : record
              ? "detail"
              : String(raw);
        return (
          <span
            key={stage}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-gray-400"
          >
            {stage}: {suffix}
          </span>
        );
      })}
    </div>
  );
}

interface GateFailure {
  id?: string;
  detail?: string;
}

interface GateCheck {
  id?: string;
  category?: string;
  passed?: boolean;
  detail?: string;
}

interface GateMetrics {
  word_count?: number;
  h2_count?: number;
  citation_count?: number;
  unique_sources?: number;
  flesch?: number;
  keyword_density?: number;
  internal_links?: number;
  visual_count?: number;
}

interface GateReportView {
  passed?: boolean;
  score?: number;
  hard_failures?: GateFailure[];
  warnings?: GateFailure[];
  metrics?: GateMetrics;
  checks?: GateCheck[];
}

function gateView(value: unknown): GateReportView | null {
  const record = asRecord(value);
  if (!record) return null;
  return record as unknown as GateReportView;
}

export function GateReportPanel({
  report,
  compact = false,
}: {
  report: unknown;
  compact?: boolean;
}) {
  const data = gateView(report);
  if (!data) {
    return (
      <p className="text-xs text-gray-500">
        No gate report yet. It appears after the editorial gate runs.
      </p>
    );
  }

  const metrics: Array<[string, unknown]> = [
    ["Words", data.metrics?.word_count],
    ["H2s", data.metrics?.h2_count],
    ["Citations", data.metrics?.citation_count],
    ["Sources", data.metrics?.unique_sources],
    ["Flesch", data.metrics?.flesch],
    ["Keyword density", data.metrics?.keyword_density],
    ["Internal links", data.metrics?.internal_links],
    ["Visuals", data.metrics?.visual_count],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={data.passed ? "completed" : "failed"} />
        <span className="text-xs text-gray-500">
          Gate score <ScoreBadge score={data.score} className="ml-1" />
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {metrics
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([label, value]) => (
            <span
              key={label}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-gray-400"
            >
              {label}:{" "}
              <span className="font-mono text-gray-200">{String(value)}</span>
            </span>
          ))}
      </div>

      {!compact && (data.hard_failures?.length ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300/80">
            Hard failures
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.hard_failures?.map((item, index) => (
              <li
                key={`${item.id ?? "failure"}-${index}`}
                className="rounded-lg border border-rose-400/15 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-100/80"
              >
                <span className="font-mono text-rose-300/80">
                  {item.id ?? "check"}
                </span>
                {item.detail ? ` — ${item.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact &&
        (data.warnings?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
              Warnings
            </p>
            <ul className="mt-2 space-y-1.5">
              {data.warnings?.map((item, index) => (
                <li
                  key={`${item.id ?? "warning"}-${index}`}
                  className="rounded-lg border border-amber-400/15 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-100/75"
                >
                  <span className="font-mono text-amber-300/80">
                    {item.id ?? "check"}
                  </span>
                  {item.detail ? ` — ${item.detail}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

      {!compact && (data.checks?.length ?? 0) > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 hover:text-gray-300">
            All checks ({data.checks?.length})
          </summary>
          <div className="mt-2 space-y-1">
            {data.checks?.map((check, index) => (
              <div
                key={`${check.id ?? "check"}-${index}`}
                className="flex items-start gap-2 rounded-md border border-white/[0.06] px-2.5 py-1.5 text-[11px]"
              >
                <span
                  className={
                    check.passed ? "text-emerald-400" : "text-rose-400"
                  }
                >
                  {check.passed ? "✓" : "×"}
                </span>
                <span className="min-w-0 flex-1 text-gray-400">
                  <span className="font-mono text-[10px] text-gray-500">
                    {check.id}
                  </span>
                  {check.detail ? ` — ${check.detail}` : ""}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const PROSE_CLASS = [
  "mt-6 text-sm leading-7 text-gray-300",
  "[&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white",
  "[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white/90",
  "[&_p]:mt-4",
  "[&_a]:text-[#cf9eff] [&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
  "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
  "[&_blockquote]:mt-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[#cf9eff]/40 [&_blockquote]:pl-4 [&_blockquote]:text-gray-400",
  "[&_figure]:contents",
  "[&_figcaption]:hidden",
  "[&_img]:mt-5 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-xl",
  "[&_table]:mt-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_th]:px-2 [&_th]:py-1.5 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1.5",
].join(" ");

export function PostPreviewDialog({
  post,
  onClose,
}: {
  post: AdminPostPreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!post) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [post, onClose]);

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${post.title}`}
        className="relative z-10 my-4 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0d0d16] shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start gap-4 rounded-t-2xl border-b border-white/10 bg-[#0d0d16]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={post.published_at ? "completed" : "draft"} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                {post.published_at ? "Published" : "Draft"}
              </span>
              <ScoreBadge score={post.seo_score} />
            </div>
            <h3 className="mt-2 truncate text-base font-semibold text-white">
              {post.title}
            </h3>
            <p className="mt-1 truncate text-xs text-gray-500">
              {post.meta_title || post.title} ·{" "}
              {post.word_count ? `${post.word_count} words` : "Word count pending"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {post.published_at && (
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-gray-300 transition-colors hover:text-white"
              >
                <ExternalLink className="size-3.5" />
                Live
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="px-5 pb-8">
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="mt-5 aspect-[1200/630] w-full rounded-xl border border-white/10 object-cover"
            />
          )}
          <p className="mt-5 text-sm leading-6 text-gray-400">{post.excerpt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
            <span>Slug: /blog/{post.slug}</span>
            <span>
              {post.published_at
                ? `Published ${formatDateTime(post.published_at)}`
                : "Not published"}
            </span>
            {post.meta_description && (
              <span className="line-clamp-2">{post.meta_description}</span>
            )}
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <GateReportPanel report={post.gate_report} compact />
          </div>
          <div
            className={PROSE_CLASS}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(post.content ?? ""),
            }}
          />
          <p className="mt-8 text-[11px] text-gray-600">
            Preview generated from the stored draft. Publish actions run through
            the FastAPI admin API and the database publish gate.
          </p>
        </div>
      </div>
    </div>
  );
}
