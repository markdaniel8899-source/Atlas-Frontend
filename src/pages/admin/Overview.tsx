import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  FileText,
  ListChecks,
  Users as UsersIcon,
} from "lucide-react";
import { fetchAdminStats, type AdminStats } from "../../lib/admin";
import { Card, ErrorState, StatCard } from "./ui";

type Status = "loading" | "ready" | "error";

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const data = await fetchAdminStats();
      setStats(data);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats.");
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
          Overview
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Platform health and activity at a glance.
        </p>
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-white/[0.04]" />
          ))}
        </div>
      )}

      {status === "error" && <ErrorState message={error} onRetry={load} />}

      {status === "ready" && stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Users"
              value={stats.totalUsers.toLocaleString()}
              sub="Registered accounts"
              icon={UsersIcon}
              accent="text-[#cf9eff]"
            />
            <StatCard
              label="Total Posts"
              value={stats.totalPosts.toLocaleString()}
              sub="Blog articles"
              icon={FileText}
              accent="text-[#9db4ff]"
            />
            <StatCard
              label="Total Quizzes"
              value={stats.totalQuizzes.toLocaleString()}
              sub="Quiz attempts logged"
              icon={ListChecks}
              accent="text-[#cf9eff]"
            />
            <StatCard
              label="System Status"
              value="Healthy"
              sub="1.2k views this week"
              icon={Activity}
              accent="text-amber-300"
            />
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-white">Getting started</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-400">
              <li>
                • Manage learner accounts on the{" "}
                <span className="text-white">Users</span> tab.
              </li>
              <li>
                • Review or remove articles on the{" "}
                <span className="text-white">Posts</span> tab.
              </li>
              <li>
                • Only accounts with the <span className="text-white">admin</span>{" "}
                role can access this panel.
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
