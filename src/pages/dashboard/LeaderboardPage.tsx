import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Loader2, Medal, Trophy, Zap } from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { getRankFromXP } from "../../lib/gamification";
import {
  fetchWeeklyLeaderboard,
  type LeaderboardEntry,
} from "../../lib/db/leaderboard";
import { EASE } from "../../lib/motion";

/** Premium glassy card configs for podium positions (1st, 2nd, 3rd) */
const PODIUM_STYLE: Record<
  number,
  {
    container: string;
    shine: string;
    positionColor: string;
    icon: string;
    zapColor: string;
    weeklyColor: string;
  }
> = {
  1: {
    container:
      "relative overflow-hidden bg-yellow-500/15 backdrop-blur-md border border-yellow-500/40 rounded-xl p-4 flex items-center justify-between group",
    shine:
      "absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-[shine_2.5s_infinite] pointer-events-none",
    positionColor: "text-yellow-400",
    icon: "🥇",
    zapColor: "text-yellow-300",
    weeklyColor: "text-yellow-200/70",
  },
  2: {
    container:
      "relative overflow-hidden bg-gradient-to-br from-slate-300/20 via-gray-300/15 to-zinc-300/10 backdrop-blur-md border border-gray-300/40 rounded-xl p-4 flex items-center justify-between group",
    shine:
      "absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] animate-[shine_3s_infinite] pointer-events-none",
    positionColor: "text-gray-200",
    icon: "🥈",
    zapColor: "text-gray-200",
    weeklyColor: "text-gray-100/80",
  },
  3: {
    container:
      "relative overflow-hidden bg-gradient-to-br from-purple-400/20 via-violet-400/15 to-fuchsia-400/10 backdrop-blur-md border border-purple-400/40 rounded-xl p-4 flex items-center justify-between group",
    shine:
      "absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-purple-200/30 to-transparent skew-x-[-20deg] animate-[shine_3.5s_infinite] pointer-events-none",
    positionColor: "text-purple-300",
    icon: "🥉",
    zapColor: "text-purple-300",
    weeklyColor: "text-purple-200/80",
  },
};

function LeaderRow({
  entry,
  place,
  index,
}: {
  entry: LeaderboardEntry;
  place: number;
  index: number;
}) {
  const rank = getRankFromXP(entry.totalXp);
  const isYou = entry.isYou;
  const podium = PODIUM_STYLE[place];

  // Premium glassy card for podium positions (1st, 2nd, 3rd)
  if (podium) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: EASE }}
        className={podium.container}
      >
        {/* Shine reflection animation */}
        <div className={podium.shine} />

        {/* Position */}
        <span
          className={`relative flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 ${podium.positionColor}`}
        >
          <span className="text-lg leading-none">{podium.icon}</span>
          <span className="text-base font-bold tracking-tight sm:text-lg">
            {place}
          </span>
        </span>

        {/* Avatar */}
        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-semibold text-white sm:size-14">
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt=""
              className="size-full rounded-full object-cover"
            />
          ) : (
            entry.initials
          )}
        </span>

        {/* Identity */}
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
              {entry.displayName}
            </h2>
            {isYou && (
              <span className="shrink-0 rounded-full border border-white/40 bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                You
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-white/55">
            <span className="truncate">@{entry.username}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${rank.tier.border} ${rank.tier.bg} ${rank.tier.text}`}
            >
              {rank.name}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-300/80">
              <Flame className="size-3" />
              {entry.streak}d
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="relative shrink-0 text-right">
          <p className="flex items-center justify-end gap-1.5 text-lg font-bold tracking-tight text-white sm:text-xl">
            <Zap className={`size-4 ${podium.zapColor}`} />
            {entry.weeklyXp.toLocaleString()}
          </p>
          <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${podium.weeklyColor}`}>
            weekly XP
          </p>
        </div>
      </motion.article>
    );
  }

  // Regular glass card for 4th+ positions
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: EASE }}
      className={`flex w-full items-center gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-md border border-white/10 transition-all hover:bg-white/[0.07] ${
        isYou ? "ring-1 ring-star/40" : ""
      }`}
    >
      {/* Position */}
      <span className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 text-white/40">
        <span className="text-base font-bold tracking-tight sm:text-lg">
          {place}
        </span>
      </span>

      {/* Avatar */}
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-semibold text-white sm:size-14">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt=""
            className="size-full rounded-full object-cover"
          />
        ) : (
          entry.initials
        )}
      </span>

      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">
            {entry.displayName}
          </h2>
          {isYou && (
            <span className="shrink-0 rounded-full border border-white/40 bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              You
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-white/55">
          <span className="truncate">@{entry.username}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${rank.tier.border} ${rank.tier.bg} ${rank.tier.text}`}
          >
            {rank.name}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300/80">
            <Flame className="size-3" />
            {entry.streak}d
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <p className="flex items-center justify-end gap-1.5 text-lg font-bold tracking-tight text-white sm:text-xl">
          <Zap className="size-4 text-blue-300/80" />
          {entry.weeklyXp.toLocaleString()}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
          weekly XP
        </p>
      </div>
    </motion.article>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWeeklyLeaderboard(50)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const you = entries.find((entry) => entry.isYou);

  // Calculate "Your rank" directly from the displayed list to stay in sync
  const myRank = useMemo(() => {
    if (!you) return null;
    const index = entries.findIndex((entry) => entry.id === you.id);
    return index >= 0 ? index + 1 : null;
  }, [entries, you]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
            This week
          </p>
          <RevealText
            as="h1"
            text="Leaderboard."
            className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
          />
          <p className="mt-2 text-sm text-white/45">
            Ranked by weekly XP · resets every Monday 00:00 UTC
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {myRank !== null && (
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2.5 text-sm font-semibold text-star">
              <Trophy className="size-4" />
              Your rank #{myRank}
            </span>
          )}
          {you && (
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2.5 text-sm text-white/70">
              <Zap className="size-4 text-blue-300/80" />
              {you.weeklyXp.toLocaleString()}
              <span className="text-xs text-white/40">XP this week</span>
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-white/40">
          <Loader2 className="size-4 animate-spin" />
          Loading leaderboard…
        </p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-8 text-center sm:p-10">
          <Medal className="mx-auto size-7 text-white/25" />
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-white">
            Nobody on the board yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/45">
            Study, finish quizzes and keep your streak alive to claim the
            first spot this week.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <LeaderRow
              key={entry.id}
              entry={entry}
              place={index + 1}
              index={index}
            />
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {loading
          ? "Loading weekly leaderboard."
          : `${entries.length} learners on the weekly leaderboard.`}
      </p>
    </div>
  );
}
