import { useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

/* 1000 svg units = 1 viewport height, so node math stays scale-free. */
const NODE_Y0 = 260;
const NODE_DY = 520;
const START_OFFSET = 240;
const END_OFFSET = -2340;

const PEAKS = [0.194, 0.395, 0.597, 0.798, 1];

const PATH_D =
  "M 180 100 C 180 160 180 200 180 260 C 180 480 380 560 380 780 C 380 1000 180 1080 180 1300 C 180 1520 380 1600 380 1820 C 380 2040 280 2120 280 2340 C 280 2440 280 2500 280 2560";

type NodeState = "done" | "active" | "locked";

const NODES: { x: number; y: number; state: NodeState }[] = [
  { x: 180, y: NODE_Y0, state: "done" },
  { x: 380, y: NODE_Y0 + NODE_DY, state: "active" },
  { x: 180, y: NODE_Y0 + NODE_DY * 2, state: "locked" },
  { x: 380, y: NODE_Y0 + NODE_DY * 3, state: "locked" },
  { x: 280, y: NODE_Y0 + NODE_DY * 4, state: "locked" },
];

const FILL: Record<NodeState, string> = {
  done: "#22c55e",
  active: "#a855f7",
  locked: "#4b5563",
};

const GLOW: Record<NodeState, string> = {
  done: "rgba(34,197,94,0.9)",
  active: "rgba(168,85,247,0.95)",
  locked: "rgba(148,163,184,0.7)",
};

const LEVELS = [
  {
    label: "Level 1",
    state: "done" as NodeState,
    title: "Start Your Journey",
    body: "Tell us what you want to learn. Our AI builds a step-by-step plan just for you.",
  },
  {
    label: "Level 2",
    state: "active" as NodeState,
    title: "Learn Step by Step",
    body: "Complete daily lessons to unlock the next step of your path.",
  },
  {
    label: "Level 3",
    state: "locked" as NodeState,
    title: "Pass Fun Quizzes",
    body: "Short tests prove you understand the topic before you move on.",
  },
  {
    label: "Level 4",
    state: "locked" as NodeState,
    title: "Never Lose Progress",
    body: "Your learning timer never resets. Every minute you study counts.",
  },
  {
    label: "Level 5",
    state: "locked" as NodeState,
    title: "Master Your Subject",
    body: "Finish your path, keep your streak, and know the topic for good.",
  },
];

interface LevelNodeProps {
  progress: MotionValue<number>;
  index: number;
  reduced: boolean;
}

function LevelNode({ progress, index, reduced }: LevelNodeProps) {
  const { x, y, state } = NODES[index];
  const peak = PEAKS[index];
  const isLast = index === PEAKS.length - 1;
  // Stops must stay within [0,1] — framer turns scroll transforms into WAAPI
  // keyframes where out-of-range offsets throw and unmount the page.
  const focusOut = useTransform(
    progress,
    [peak - 0.09, peak, peak + 0.09],
    [0, 1, 0],
  );
  const focusHold = useTransform(progress, [peak - 0.09, peak], [0, 1]);
  const focus = isLast ? focusHold : focusOut;
  const scale = useTransform(focus, [0, 1], [1, 1.22]);
  const baseBlur = state === "active" ? 14 : state === "done" ? 10 : 4;
  const blurPx = useTransform(focus, [0, 1], [baseBlur, baseBlur + 16]);
  const filter = useMotionTemplate`drop-shadow(0 0 ${blurPx}px ${GLOW[state]})`;

  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g style={reduced ? undefined : { scale }}>
        <motion.circle
          r={42}
          fill="none"
          stroke={FILL[state]}
          strokeWidth={3}
          style={{ opacity: focus }}
        />
        <motion.circle
          r={30}
          fill={FILL[state]}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={3}
          style={{ filter }}
        />
        {state === "done" && (
          <path
            d="M -9 0 L -3 6.5 L 9.5 -7.5"
            fill="none"
            stroke="#ffffff"
            strokeWidth={3.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {state === "active" && (
          <path d="M -7 -10 L 10 0 L -7 10 Z" fill="#ffffff" />
        )}
        {state === "locked" && (
          <g>
            <rect x={-9} y={-2} width={18} height={14} rx={3} fill="#ffffff" />
            <path
              d="M -5 -2 V -7.5 a 5 5 0 0 1 10 0 V -2"
              fill="none"
              stroke="#ffffff"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        )}
      </motion.g>
    </g>
  );
}

interface LevelCardProps {
  progress: MotionValue<number>;
  index: number;
  reduced: boolean;
}

function LevelCard({ progress, index, reduced }: LevelCardProps) {
  const level = LEVELS[index];
  const peak = PEAKS[index];
  const isLast = index === PEAKS.length - 1;
  const opacityOut = useTransform(
    progress,
    [peak - 0.1, peak - 0.03, peak + 0.05, peak + 0.1],
    [0, 1, 1, 0],
  );
  const opacityHold = useTransform(
    progress,
    [peak - 0.1, peak - 0.03, 1],
    [0, 1, 1],
  );
  const opacity = isLast ? opacityHold : opacityOut;
  const y = useTransform(progress, [peak - 0.1, peak - 0.03], [50, 0]);
  const blur = useTransform(progress, [peak - 0.1, peak - 0.03], [10, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  const side =
    index % 2 === 0 ? "lg:left-[5vw] lg:right-auto" : "lg:right-[5vw] lg:left-auto";

  return (
    <div
      className={`absolute inset-x-0 bottom-[7%] z-10 flex justify-center px-5 lg:inset-x-auto lg:bottom-auto lg:top-1/2 lg:block lg:w-[min(34vw,400px)] lg:-translate-y-1/2 lg:px-0 ${side}`}
    >
      <motion.div
        style={
          reduced
            ? { opacity }
            : { opacity, y, filter }
        }
        className="glass card-sheen rounded-2xl p-5 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] sm:p-6 lg:text-left"
      >
        <p className="flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.4em] text-star/80 lg:justify-start">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: FILL[level.state] }}
          />
          {level.label}
        </p>
        <h3 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
          {level.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{level.body}</p>
      </motion.div>
    </div>
  );
}

export function LearningPathSection() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const pathY = useTransform(
    scrollYProgress,
    [0, 1],
    [START_OFFSET, END_OFFSET],
  );
  const fillProgress = useTransform(
    scrollYProgress,
    [0.04, 0.97],
    [0, 1],
  );

  const introOpacity = useTransform(
    scrollYProgress,
    [0, 0.05, 0.1],
    [1, 1, 0],
  );
  const introY = useTransform(scrollYProgress, [0, 0.1], [0, -40]);
  const introBlur = useTransform(scrollYProgress, [0, 0.1], [0, 8]);
  const introFilter = useMotionTemplate`blur(${introBlur}px)`;

  const hudOpacity = useTransform(scrollYProgress, [0.07, 0.12], [0, 1]);
  const rawLevel = useTransform(
    scrollYProgress,
    PEAKS,
    [1, 2, 3, 4, 5],
  );
  const [level, setLevel] = useState(() => Math.round(rawLevel.get()));
  useMotionValueEvent(rawLevel, "change", (v) => setLevel(Math.round(v)));

  return (
    <section
      id="learning-path"
      ref={ref}
      className="relative z-[2] h-[500vh] w-full bg-[#04040a] shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.75)]"
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(120,80,255,0.14),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_80%_80%,rgba(34,211,238,0.08),transparent_70%)]"
        />

        {/* The winding path — travels up as the user scrolls */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2" aria-hidden>
          <svg
            viewBox="0 0 560 2600"
            className="h-[260vh] w-[56vh]"
            role="img"
            aria-label="Learning path with five levels: one complete, one in progress, three locked"
          >
            <defs>
              <linearGradient id="lp-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <motion.g style={{ y: pathY }}>
              <path
                d={PATH_D}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={8}
                strokeLinecap="round"
              />
              <motion.path
                d={PATH_D}
                fill="none"
                stroke="url(#lp-gradient)"
                strokeWidth={8}
                strokeLinecap="round"
                style={{
                  pathLength: fillProgress,
                  filter: "drop-shadow(0 0 8px rgba(168,85,247,0.6))",
                }}
              />
              {NODES.map((_, i) => (
                <LevelNode key={i} progress={scrollYProgress} index={i} reduced={reduced} />
              ))}
            </motion.g>
          </svg>
        </div>

        {/* Level HUD */}
        <motion.div
          style={{ opacity: hudOpacity }}
          className="absolute inset-x-0 top-5 z-30 flex justify-center px-6"
        >
          <div className="glass flex items-center gap-3 rounded-full px-4 py-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">
              Level
            </span>
            <motion.span className="min-w-4 text-center text-sm font-semibold text-white tabular-nums">
              {level}
            </motion.span>
            <span className="text-xs text-white/40">/ {LEVELS.length}</span>
            <span
              aria-hidden
              className="h-1 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28"
            >
              <motion.span
                style={{ scaleX: scrollYProgress, originX: 0 }}
                className="block h-full w-full rounded-full bg-[linear-gradient(90deg,#a855f7,#22d3ee)]"
              />
            </span>
          </div>
        </motion.div>

        {/* Opening title card */}
        <motion.div
          style={
            reduced
              ? { opacity: introOpacity }
              : { opacity: introOpacity, y: introY, filter: introFilter }
          }
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.45em] text-star/70">
            Your learning path
          </p>
          <h2 className="mt-4 max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-tighter text-white sm:text-6xl lg:text-7xl">
            A Clear Path for Every Subject.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/55">
            Just tell us what you want to learn. Our AI creates a step-by-step
            plan just for you.
          </p>
          <span className="mt-8 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">
            Scroll to start ↓
          </span>
        </motion.div>

        {/* Level story cards */}
        {LEVELS.map((_, i) => (
          <LevelCard key={i} progress={scrollYProgress} index={i} reduced={reduced} />
        ))}
      </div>
    </section>
  );
}