import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, CalendarCheck, Clock } from "lucide-react";
import { RevealText } from "../../components/RevealText";
import { loadSessions } from "../../lib/timer";
import { buildGrid, gridStats } from "../../lib/calendar";
import { FOCUS_CHANGED_EVENT } from "../../lib/db/events";
import { EASE } from "../../lib/motion";

const LEVEL_CLASS = [
  "bg-white/[0.045]",
  "bg-[rgba(157,180,255,0.2)]",
  "bg-[rgba(157,180,255,0.4)]",
  "bg-[rgba(157,180,255,0.65)]",
  "bg-[rgba(157,180,255,0.92)]",
];

const LEVEL_HINT = ["No focus", "Under 25m", "25–60m", "1–2h", "2h+"];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function CalendarPage() {
  const sessions = loadSessions();
  const stats = useMemo(() => gridStats(sessions), [sessions]);
  const grid = useMemo(() => buildGrid(sessions), [sessions]);
  // Pages stay mounted: re-render (and re-read localStorage sessions) after
  // every logged focus session, even while this tab is hidden.
  const [, setHistoryTick] = useState(0);
  useEffect(() => {
    const refresh = () => setHistoryTick((tick) => tick + 1);
    window.addEventListener(FOCUS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(FOCUS_CHANGED_EVENT, refresh);
  }, []);
  const [hovered, setHovered] = useState<{
    label: string;
    minutes: number;
    level: number;
  } | null>(null);

  const monthLabels = grid.map((week) => {
    const first = week.find((c) => c.dateKey);
    if (!first) return "";
    const d = new Date(`${first.dateKey}T00:00:00`);
    return d.getDate() <= 7 ? MONTHS[d.getMonth()] : "";
  });

  const tiles = [
    {
      label: "Hours logged",
      value: `${stats.totalHours}h`,
      icon: Clock,
    },
    {
      label: "Current streak",
      value: `${stats.currentStreak} days`,
      icon: Flame,
    },
    {
      label: "Longest streak",
      value: `${stats.longestStreak} days`,
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-star/70">
          The map
        </p>
        <RevealText
          as="h1"
          text="Every day you showed up."
          className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
            className="glass card-sheen rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-5"
          >
            <tile.icon className="size-4 text-star/80" />
            <p className="mt-3 font-mono text-xl tabular-nums text-white sm:text-3xl">
              {tile.value}
            </p>
            <p className="mt-1 text-[11px] text-white/40 sm:text-xs">
              {tile.label}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        className="glass card-sheen relative rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] sm:p-8"
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="flex shrink-0 flex-col gap-[3px] pt-5">
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((label, i) => (
              <span
                key={i}
                className="flex h-3 items-center text-[9px] text-white/30 sm:text-[10px]"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="min-w-max">
            <div className="mb-1.5 flex gap-[3px]">
              {monthLabels.map((label, i) => (
                <span
                  key={i}
                  className="w-3 text-[9px] text-white/30 sm:w-3.5 sm:text-[10px]"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {grid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`group relative size-3 rounded-[3px] transition-transform duration-150 hover:scale-125 sm:size-3.5 ${LEVEL_CLASS[day.level]}`}
                      onMouseEnter={() =>
                        setHovered({
                          label: day.label,
                          minutes: day.minutes,
                          level: day.level,
                        })
                      }
                      onMouseLeave={() => setHovered(null)}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {hovered && (
          <div className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-[rgba(8,8,16,0.95)] px-3 py-1.5 text-xs whitespace-nowrap text-white shadow-xl">
            {hovered.label} ·{" "}
            <span className="text-star">
              {hovered.minutes > 0 ? `${hovered.minutes}m` : LEVEL_HINT[0]}
            </span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="text-[11px] text-white/35">{stats.activeDays} active days</span>
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <span>Less</span>
            {LEVEL_CLASS.map((cls, i) => (
              <span
                key={i}
                className={`size-3 rounded-[3px] ${cls}`}
                title={LEVEL_HINT[i]}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
