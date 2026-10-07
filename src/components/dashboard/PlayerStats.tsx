import { motion } from "framer-motion";
import { Flame, Hexagon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../ui/Card";
import { EASE } from "../../lib/motion";
import { levelProgress } from "../../lib/db/types";
import type { Profile } from "../../lib/db/types";

interface PlayerStatsProps {
  profile: Profile | null;
  loading: boolean;
}

function Cell({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-xl border ${tone}`}
      >
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-xl font-semibold tabular-nums text-white">{value}</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/35">
          {label}
        </p>
      </div>
    </div>
  );
}

export function PlayerStats({ profile, loading }: PlayerStatsProps) {
  if (loading) {
    return (
      <Card className="p-6 sm:p-7">
        <div className="animate-pulse space-y-5">
          <div className="flex gap-8">
            <div className="h-11 w-36 rounded-xl bg-white/[0.06]" />
            <div className="h-11 w-36 rounded-xl bg-white/[0.06]" />
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/[0.05]" />
        </div>
      </Card>
    );
  }

  const stats = levelProgress(profile?.xp ?? 0);
  const streak = profile?.streak ?? 0;

  return (
    <Card className="relative overflow-hidden p-6 sm:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-16 size-72 rounded-full bg-[#cf9eff]/12 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center gap-x-10 gap-y-6">
        <Cell
          tone="border-orange-400/25 bg-orange-400/[0.08]"
          icon={<Flame className="size-5 text-[#ff8f52]" />}
          value={String(streak)}
          label="day streak"
        />

        <span
          aria-hidden="true"
          className="hidden h-11 w-px bg-white/[0.08] sm:block"
        />

        <Cell
          tone="border-[#cf9eff]/30 bg-[#cf9eff]/10"
          icon={<Hexagon className="size-5 text-[#cf9eff]" />}
          value={String(stats.level)}
          label="level"
        />

        <div className="ml-auto text-right leading-tight">
          <p className="font-mono text-lg tabular-nums text-white">
            {stats.into}
            <span className="text-white/30"> / {stats.need}</span>
            <span className="ml-1.5 text-xs text-[#cf9eff]">XP</span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/35">
            to level {stats.level + 1}
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.percent}%` }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }}
            className="h-full rounded-full bg-gradient-to-r from-[#7b8ee8] via-[#a58cff] to-[#cf9eff] shadow-[0_0_18px_rgba(207,158,255,0.55)]"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-white/35">
          <span className="min-w-0 truncate">
            {Math.round(stats.percent)}% of level {stats.level} complete
          </span>
          <span className="shrink-0 truncate text-white/50">
            {profile ? `@${profile.username}` : "unlinked profile"}
          </span>
        </div>
      </div>
    </Card>
  );
}
