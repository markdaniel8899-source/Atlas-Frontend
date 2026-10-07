import { useMemo, useRef, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Flame, Plus, Timer } from "lucide-react";
import { SQUAD, type Friend } from "../../lib/friends";
import { ScrollWords } from "../ScrollWords";

interface SquadItem {
  id: string;
  label: string;
  content: ReactNode;
}

const LOOP_SECONDS = 16;
const CARD_W = 0.16;
const CARD_AR = 1.35;
const WAVE_AMPLITUDE = 20;

const STATUS_DOT: Record<string, string> = {
  studying: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  online: "bg-star shadow-[0_0_8px_rgba(157,180,255,0.8)]",
  offline: "bg-white/25",
};

function SquadCard({ friend, bobDelay }: { friend: Friend; bobDelay: number }) {
  return (
    <article
      data-bob
      style={{
        animation: `card-bob ${5.5 + (bobDelay % 3)}s ease-in-out ${bobDelay}s infinite`,
      }}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#cf9eff]/20 bg-[#cf9eff]/[0.06] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-[#cf9eff]/45 hover:shadow-[0_22px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(207,158,255,0.22)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_-25%,rgba(207,158,255,0.2),transparent_62%)]"
      />
      <div className="relative flex items-center gap-3">
        <div
          className={`relative flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white ${friend.avatar}`}
        >
          {friend.initials}
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#04040a] ${STATUS_DOT[friend.status]}`}
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-white">
            {friend.name}
          </h3>
          <p className="truncate text-xs text-white/40">{friend.handle}</p>
        </div>
        <span className="ml-auto rounded-full border border-[#cf9eff]/25 bg-[#cf9eff]/10 px-2 py-0.5 text-[10px] font-medium text-[#cf9eff]/85">
          Lv {friend.level}
        </span>
      </div>

      <div className="relative mt-auto space-y-2.5 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-white/45">
            <Timer className="size-3.5" />
            {Math.round(friend.minutesThisWeek / 60)}h this week
          </span>
          <span className="flex items-center gap-1 text-amber-300/90">
            <Flame className="size-3.5" />
            {friend.streak}d
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-linear-to-r from-[#cf9eff]/60 to-[#cf9eff]"
            style={{
              width: `${Math.min(100, Math.round((friend.minutesThisWeek / friend.goalMinutes) * 100))}%`,
            }}
          />
        </div>
      </div>
    </article>
  );
}

function InviteCard({ bobDelay }: { bobDelay: number }) {
  return (
    <button
      type="button"
      data-bob
      style={{
        animation: `card-bob ${5.5 + (bobDelay % 3)}s ease-in-out ${bobDelay}s infinite`,
      }}
      className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[#cf9eff]/25 bg-[#cf9eff]/[0.05] text-[#cf9eff]/60 transition-colors hover:border-[#cf9eff]/50 hover:bg-[#cf9eff]/[0.09] hover:text-white/85"
    >
      <span className="relative flex size-11 items-center justify-center rounded-full border border-[#cf9eff]/30">
        <Plus className="size-5" />
      </span>
      <span className="relative text-sm">Invite your crew</span>
    </button>
  );
}

/**
 * A glass card riding an INFINITE bottom → top S-curve path.
 * Vertical: linear rise from below the container to above it (wrap is clipped).
 * Horizontal: cos(3·π·t), starts bottom-right, weaves left, back right,
 * passes top-left (1.5 sine periods per loop). Rotation follows horizontal
 * velocity so the card tilts with the curve like it is drifting on a river.
 * Each card is phase-shifted (index / total) so the crew spreads along the
 * path and the loop wraps seamlessly.
 */
function RiverCard({
  item,
  index,
  total,
  progress,
}: {
  item: SquadItem;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const phase = index / total;
  const tOf = (raw: number) => (raw + phase) % 1;

  const topNumber = useTransform(progress, (raw) => 102 - tOf(raw) * 124);
  const top = useMotionTemplate`${topNumber}%`;
  const left = useTransform(
    progress,
    (raw) =>
      `${50 + Math.cos(tOf(raw) * 3 * Math.PI) * WAVE_AMPLITUDE - (CARD_W * 100) / 2}%`,
  );
  const rotate = useTransform(
    progress,
    (raw) => -Math.sin(tOf(raw) * 3 * Math.PI) * 6,
  );

  return (
    <motion.div
      className="absolute top-0 left-0 shadow-[0_16px_40px_rgba(0,0,0,0.45)] will-change-transform"
      style={{
        top,
        left,
        rotate,
        width: `clamp(190px, ${CARD_W * 100}%, 260px)`,
        aspectRatio: `${CARD_AR}`,
        zIndex: 10 + index,
      }}
    >
      {item.content}
    </motion.div>
  );
}

export function SquadSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: headerRef,
    offset: ["start 85%", "start 30%"],
  });

  const clock = useMotionValue(0);
  useAnimationFrame((time) => {
    clock.set((time / (LOOP_SECONDS * 1000)) % 1);
  });

  const items = useMemo<SquadItem[]>(
    () => [
      ...SQUAD.map((friend, i) => ({
        id: friend.id,
        label: friend.name,
        content: <SquadCard friend={friend} bobDelay={i * 0.8} />,
      })),
      {
        id: "invite",
        label: "Invite your crew",
        content: <InviteCard bobDelay={SQUAD.length * 0.8} />,
      },
    ],
    [],
  );

  return (
    <div className="flex h-full flex-col pt-8 pb-6 sm:pt-10">
      <div ref={headerRef} className="px-6 sm:px-10 lg:px-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
          The squad
        </p>
        <h2 className="mt-3 text-6xl font-extrabold leading-[0.95] tracking-tighter text-white sm:text-7xl">
          <ScrollWords text="Climb together." progress={scrollYProgress} />
        </h2>
        <p className="mt-3 hidden max-w-lg text-sm text-white/50 sm:block">
          Your crew's streaks and hours move while you watch. Borrow their
          momentum on the days yours runs low.
        </p>
      </div>

      <div className="relative hidden min-h-0 flex-1 overflow-hidden md:block">
        {items.map((item, i) => (
          <RiverCard
            key={item.id}
            item={item}
            index={i}
            total={items.length}
            progress={clock}
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-wrap items-start justify-center gap-4 md:hidden">
        {items.map((item) => (
          <div key={item.id} className="w-[min(260px,80vw)]">
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
