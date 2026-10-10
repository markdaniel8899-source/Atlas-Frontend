import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Loader2, Medal, Trophy, Zap } from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { rankForLevel } from "../../lib/gamification";
import {
  fetchMyWeeklyRank,
  fetchWeeklyLeaderboard,
  type LeaderboardEntry,
} from "../../lib/db/leaderboard";
import { EASE } from "../../lib/motion";

/** Top 3 themed cards: gold, silver, platinum. Everyone else is dark. */
const PODIUM_STYLE: Record<
  number,
  { card: string; position: string; shine?: boolean }
> = {
  1: {
    card: "border-yellow-400/50 bg-gradient-to-r from-yellow-800 via-yellow-600 to-yellow-800 shadow-[0_0_36px_-8px_rgba(250,204,21,0.55)]",
    position: "text-yellow-100",
    shine: true,
  },
  2: {
    card: "border-zinc-300/40 bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700 shadow-[0_0_28px_-10px_rgba(212,212,216,0.45)]",
    position: "text-zinc-100",
  },
  3: {
    card: "border-cyan-400/45 bg-gradient-to-r from-cyan-800 via-cyan-600 to-cyan-800 shadow-[0_0_28px_-10px_rgba(34,211,238,0.45)]",
    position: "text-cyan-100",
  },
};

const PODIUM_ICON: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
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
  const rank = rankForLevel(entry.level);
  const RankIcon = rank.icon;
  const themed = PODIUM_STYLE[place];
  const dark =
    entry.isYou && !themed
      ? "border-star/40 bg-star/[0.07] shadow-[0_0_28px_-12px_rgba(157,180,255,0.6)]"
      : "border-white/[0.06] bg-[#111111] hover:border-white/12";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05, ease: EASE }}
      className={`relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border px-4 py-4 transition-colors sm:gap-5 sm:px-6 sm:py-5 ${
        themed ? themed.card : dark
      }`}
    >
      {themed?.shine && (
        <span
          aria-hidden="true"
          className="leaderboard-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      )}

      {/* Position */}
      <span
        className={`relative flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 sm:w-14 ${
          themed ? themed.position : "text-white/40"
        }`}
      >
        {themed ? (
          <span className="text-lg leading-none">{PODIUM_ICON[place]}</span>
        ) : null}
        <span className="text-base font-bold tracking-tight sm:text-lg">
          {place}
        </span>
      </span>

      {/* Avatar */}
      <span
        className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-sm font-semibold text-white ring-2 ring-offset-2 ring-offset-black sm:size-14 ${rank.ring}`}
      >
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
          {entry.isYou && (
            <span className="shrink-0 rounded-full border border-white/40 bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              You
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-white/55">
          <span className="truncate">@{entry.username}</span>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${rank.border} ${rank.bg} ${rank.text}`}
          >
            <RankIcon className="size-3" />
            Lvl {entry.level} · {rank.label}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300/80">
            <Flame className="size-3" />
            {entry.streak}d
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="relative shrink-0 text-right">
        <p
          className={`flex items-center justify-end gap-1.5 text-lg font-bold tracking-tight sm:text-xl ${
            themed ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" : "text-white"
          }`}
        >
          <Zap className={`size-4 ${themed ? "text-white/85" : "text-blue-300/80"}`} />
          {entry.weeklyXp.toLocaleString()}
        </p>
        <p
          className={`text-[10px] font-medium uppercase tracking-[0.18em] ${
            themed ? "text-white/75" : "text-white/35"
          }`}
        >
          weekly XP
        </p>
      </div>
    </motion.article>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchWeeklyLeaderboard(50),
      fetchMyWeeklyRank(),
    ])
      .then(([rows, rank]) => {
        if (cancelled) return;
        setEntries(rows);
        setMyRank(rank);
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
            <span className="inline-flex items-center gap-2 rounded-2xl border border-star/30 bg-star/10 px-4 py-2.5 text-sm font-semibold text-star">
              <Trophy className="size-4" />
              Your rank #{myRank}
            </span>
          )}
          {you && (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/70">
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center sm:p-10">
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
        <div className="space-y-3.5">
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
