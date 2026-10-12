import { useCallback, useEffect, useState } from "react";
import {
  CircleCheck,
  Clock,
  FileText,
  ListChecks,
  Users,
  XCircle,
} from "lucide-react";
import {
  fetchRecentAttempts,
  fetchUsageStats,
  type RecentAttempt,
  type UsageStats,
} from "../../lib/admin";
import {
  Card,
  EmptyState,
  ErrorState,
  StatCard,
  formatDate,
} from "./ui";

type Status = "loading" | "ready" | "error";

/** Seconds → compact human duration ("47m", "3h 12m", "2d 5h"). */
function formatFocus(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Usage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [recent, setRecent] = useState<RecentAttempt[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const [nextStats, nextRecent] = await Promise.all([
        fetchUsageStats(),
        fetchRecentAttempts(5),
      ]);
      setStats(nextStats);
      setRecent(nextRecent);
      setStatus("ready");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load usage stats.",
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Usage &amp; Analytics
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Platform activity at a glance.
        </p>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="h-20 animate-pulse rounded-lg bg-white/[0.04]" />
            </Card>
          ))}
        </div>
      )}

      {status === "error" && (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      )}

      {status === "ready" && stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Quizzes Taken"
              value={stats.totalQuizzes.toLocaleString()}
              sub="Total attempts"
              icon={ListChecks}
              accent="text-[#cf9eff]"
            />
            <StatCard
              label="Users"
              value={stats.totalUsers.toLocaleString()}
              sub="Registered accounts"
              icon={Users}
              accent="text-[#cf9eff]"
            />
            <StatCard
              label="Blog Posts"
              value={stats.totalPosts.toLocaleString()}
              sub="Drafts + published"
              icon={FileText}
              accent="text-[#9db4ff]"
            />
            <StatCard
              label="Focus Time"
              value={formatFocus(stats.totalFocusSeconds)}
              sub="All study sessions"
              icon={Clock}
              accent="text-amber-300"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-sm font-semibold text-white">
                Recent Activity
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Last 5 quiz attempts
              </p>
            </div>

            {recent.length === 0 ? (
              <EmptyState message="No quiz attempts yet." />
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {recent.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <span
                      className={
                        attempt.isCorrect
                          ? "text-[#cf9eff]"
                          : "text-rose-400"
                      }
                      aria-label={attempt.isCorrect ? "Correct" : "Incorrect"}
                    >
                      {attempt.isCorrect ? (
                        <CircleCheck className="size-4" />
                      ) : (
                        <XCircle className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">
                        Quiz #{attempt.quizId} ·{" "}
                        <span className="tabular-nums text-gray-300">
                          {Math.round(attempt.score)}%
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(attempt.createdAt)}
                      </p>
                    </div>
                    <div className="hidden w-32 shrink-0 sm:block">
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-white/10"
                        role="presentation"
                      >
                        <div
                          className={`h-full rounded-full ${
                            attempt.isCorrect
                              ? "bg-[#cf9eff]/80"
                              : "bg-rose-400/80"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, attempt.score))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
