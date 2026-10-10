import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Flame,
  Footprints,
  Gem,
  Loader2,
  Lock,
  Moon,
  Star,
  Trophy,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  TIER_STYLES,
  fetchAchievements,
  type Achievement,
  type AchievementCollection,
} from "../../lib/db/achievements";
import { EASE } from "../../lib/motion";

const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  flame: Flame,
  moon: Moon,
  wand: Wand2,
  footprints: Footprints,
  crown: Crown,
  star: Star,
  gem: Gem,
};

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AchievementsPanel({ userId }: { userId: string }) {
  const [collection, setCollection] = useState<AchievementCollection | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAchievements(userId)
      .then((next) => {
        if (!cancelled) setCollection(next);
      })
      .catch(() => {
        if (!cancelled) setCollection({ achievements: [], unlocked: new Map() });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const achievements = collection?.achievements ?? [];
  const unlockedCount = achievements.filter((a) =>
    collection?.unlocked.has(a.id),
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-white/45 uppercase">
          <Trophy className="size-3.5 text-amber-300/80" />
          Trophies
        </div>
        <span className="text-[11px] text-white/35">
          {loading
            ? "Loading…"
            : `${unlockedCount}/${achievements.length || 0} unlocked`}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-white/55">
        Badges are awarded automatically as you study - keep streaks alive,
        crush quizzes and burn the midnight oil.
      </p>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-white/40">
          <Loader2 className="size-3.5 animate-spin" />
          Loading trophies…
        </p>
      ) : achievements.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">
          No trophies available yet.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {achievements.map((achievement: Achievement, index: number) => {
            const unlockedAt = collection?.unlocked.get(achievement.id);
            const unlocked = Boolean(unlockedAt);
            const tier = TIER_STYLES[achievement.tier] ?? TIER_STYLES.bronze;
            const Icon = ICONS[achievement.icon] ?? Trophy;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
                title={achievement.description}
                className={`relative flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                  unlocked
                    ? `${tier.ring} ${tier.bg} ${tier.glow}`
                    : "border-white/[0.07] bg-white/[0.02] opacity-60"
                }`}
              >
                <span
                  className={`relative grid size-10 shrink-0 place-items-center rounded-lg border ${
                    unlocked
                      ? `${tier.ring} ${tier.bg} ${tier.text}`
                      : "border-white/10 bg-white/[0.04] text-white/40"
                  }`}
                >
                  <Icon
                    className={`size-4.5 ${unlocked ? "" : "opacity-50 grayscale"}`}
                  />
                  {!unlocked && (
                    <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border border-white/15 bg-black/85 text-white/55 shadow-sm">
                      <Lock className="size-2.5" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        unlocked ? "text-white" : "text-white/50"
                      }`}
                    >
                      {achievement.title}
                    </p>
                    {unlocked && (
                      <span
                        className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${tier.ring} ${tier.text}`}
                      >
                        {tier.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">
                    {achievement.description}
                  </p>
                  {unlocked && unlockedAt && (
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                      Unlocked {formatDate(unlockedAt)}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
