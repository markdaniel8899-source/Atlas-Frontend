import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Skull, Zap } from "lucide-react";
import type {
  LevelPoint,
  NodeStatus,
  RoadmapGraph,
} from "../../lib/roadmapGraph";
import {
  layoutLevels,
  orderedNodes,
  phaseProgress,
  trailPath,
  trailSegmentPath,
} from "../../lib/roadmapGraph";

interface RoadmapMapProps {
  graph: RoadmapGraph;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

const STATUS_WORD: Record<NodeStatus, string> = {
  completed: "Completed",
  active: "Active",
  locked: "Locked",
};

const BADGE_CLASS: Record<NodeStatus, string> = {
  completed: "bg-[#a855f7]/20 text-[#e9d5ff]",
  active: "bg-[#a855f7]/25 text-violet-200",
  locked: "bg-white/10 text-white/45",
};

/** Deterministic floating sparkles drifting over the map background. */
const PARTICLES = [
  { x: 6, y: 4, ch: "✦", cls: "text-violet-300/70", size: 13, dur: 11, delay: 0 },
  { x: 23, y: 16, ch: "·", cls: "text-cyan-300/70", size: 18, dur: 13, delay: 1.4 },
  { x: 48, y: 7, ch: "✦", cls: "text-sky-300/60", size: 11, dur: 12, delay: 0.6 },
  { x: 72, y: 22, ch: "✧", cls: "text-fuchsia-300/60", size: 14, dur: 14, delay: 2.2 },
  { x: 89, y: 11, ch: "·", cls: "text-violet-300/60", size: 20, dur: 10, delay: 0.9 },
  { x: 13, y: 61, ch: "✦", cls: "text-cyan-300/60", size: 12, dur: 15, delay: 1.8 },
  { x: 64, y: 75, ch: "✧", cls: "text-violet-300/60", size: 13, dur: 12, delay: 0.3 },
  { x: 35, y: 89, ch: "✦", cls: "text-sky-300/70", size: 15, dur: 13, delay: 2.6 },
];

interface SegmentStyle {
  stroke: string;
  strokeWidth: number;
  dash?: string;
  className: string;
  draw?: boolean;
}

function overlayStyle(status: NodeStatus): SegmentStyle | null {
  if (status === "completed") {
    return { stroke: "url(#atlas-trail-grad)", strokeWidth: 5, className: "", draw: true };
  }
  if (status === "active") {
    return {
      stroke: "#e9d5ff",
      strokeWidth: 4,
      dash: "6 8",
      className: "atlas-edge-neon",
    };
  }
  return null;
}

type PopupSide = "top" | "bottom";
type PopupAlign = "left" | "center" | "right";

function popupClass(side: PopupSide, align: PopupAlign): string {
  const vertical =
    side === "top" ? "bottom-[calc(100%+12px)]" : "top-[calc(100%+12px)]";
  const horizontal =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";
  return `${vertical} ${horizontal}`;
}

function Popup({
  side,
  align,
  title,
  body,
}: {
  side: PopupSide;
  align: PopupAlign;
  title: string;
  body: string;
}) {
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute z-40 w-52 rounded-xl border border-white/15 bg-[#0b0b16]/95 p-3 text-left shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] opacity-0 backdrop-blur-md transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${popupClass(
        side,
        align,
      )}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-300">
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-white/75">{body}</p>
    </div>
  );
}

export function RoadmapMap({ graph, selectedKey, onSelect }: RoadmapMapProps) {
  const ordered = useMemo(() => orderedNodes(graph.nodes), [graph]);
  const layout = useMemo(() => layoutLevels(graph), [graph]);
  const trail = useMemo(
    () =>
      ordered
        .map((node) => layout.points.get(node.key))
        .filter(Boolean) as LevelPoint[],
    [ordered, layout],
  );
  const ribbon = useMemo(() => trailPath(trail), [trail]);

  // Fit the fixed-width canvas into narrow (mobile) viewports.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const available = el.clientWidth;
      setScale(Math.min(1, available / layout.width));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout.width]);

  // Phase ribbons at every 5th level, sitting in the gap below that row.
  const dividers = useMemo(() => {
    const out: {
      key: string;
      y: number;
      delay: number;
      phaseNumber: number;
      title: string;
      complete: boolean;
      done: number;
      total: number;
    }[] = [];

    for (let i = 4; i < ordered.length - 1; i += 5) {
      const a = trail[i];
      const b = trail[i + 1];
      const next = ordered[i + 1];
      if (!a || !b || !next) continue;
      const phase = graph.phases.find((p) => p.number === next.phaseNumber);
      const counts = phaseProgress(graph, next.phaseNumber);
      out.push({
        key: `div-${i}`,
        y: (a.cy + a.size / 2 + (b.cy - b.size / 2)) / 2,
        delay: (i + 1) * 45 + 220,
        phaseNumber: next.phaseNumber,
        title: phase?.title ?? "Journey",
        complete: counts.total > 0 && counts.completed >= counts.total,
        done: counts.completed,
        total: counts.total,
      });
    }
    return out;
  }, [ordered, trail, graph]);

  return (
    <div
      className="no-scrollbar relative overflow-auto rounded-3xl border border-white/10 pt-10 sm:pt-[100px] shadow-[0_28px_80px_-45px_rgba(126,34,206,0.65)]"
      style={{
        backgroundColor: "#07070f",
        backgroundImage:
          "radial-gradient(900px 380px at 14% -6%, rgba(168,85,247,0.10), transparent 65%), " +
          "radial-gradient(760px 420px at 88% 106%, rgba(157,180,255,0.07), transparent 65%)",
        backgroundSize: "auto, auto",
        backgroundRepeat: "no-repeat, no-repeat",
      }}
    >
      {/* Desktop: original full layout. Mobile: scaled + centered canvas. */}
      <div ref={scrollRef} className="w-full">
      <div
        className={scale >= 1 ? undefined : "relative mx-auto"}
        style={
          scale >= 1
            ? undefined
            : { width: layout.width * scale, height: layout.height * scale }
        }
      >
      <div
        className="relative min-w-full"
        style={{
          width: layout.width,
          height: layout.height,
          ...(scale >= 1
            ? null
            : { transform: `scale(${scale})`, transformOrigin: "top left" }),
        }}
      >
        {/* Theme-coloured soft blur washes behind the map. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[-6%] top-[6%] z-0 h-72 w-96 rounded-full bg-[#cf9eff]/12 blur-[90px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-8%] top-[45%] z-0 h-80 w-[26rem] rounded-full bg-[#a855f7]/14 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[22%] bottom-[8%] z-0 h-64 w-80 rounded-full bg-[#7c3aed]/12 blur-[110px]"
        />
        {/* -----------------------------------------------------------
            BACKGROUND: animated gradient mesh + grid + drifting sparkle
        ----------------------------------------------------------- */}
        <div
          aria-hidden="true"
          data-animate
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(560px 420px at 18% 12%, rgba(168,85,247,0.10), transparent 70%), " +
              "radial-gradient(640px 460px at 78% 38%, rgba(59,130,246,0.09), transparent 70%), " +
              "radial-gradient(560px 520px at 40% 86%, rgba(34,211,238,0.08), transparent 70%)",
            animation: "mesh-drift 34s ease-in-out infinite alternate",
          }}
        />
        <div
          aria-hidden="true"
          data-animate
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(520px 480px at 84% 18%, rgba(99,102,241,0.08), transparent 70%), " +
              "radial-gradient(600px 440px at 22% 72%, rgba(236,72,153,0.06), transparent 70%)",
            animation: "mesh-drift 46s ease-in-out infinite alternate-reverse",
          }}
        />
        {PARTICLES.map((p, i) => (
          <span
            key={`pt-${i}`}
            aria-hidden="true"
            data-animate
            className={`pointer-events-none absolute z-0 select-none ${p.cls}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: p.size,
              animation:
                `atlas-sparkle ${p.dur / 2}s ease-in-out ${p.delay}s infinite, ` +
                `atlas-particle-drift ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
            }}
          >
            {p.ch}
          </span>
        ))}
        {/* Vignette: soft darkening on the edges, under the content. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{ boxShadow: "inset 0 0 110px 26px rgba(4,4,10,0.7)" }}
        />

        {/* -----------------------------------------------------------
            TRAIL: gradient ribbon, flowing light, status overlays
        ----------------------------------------------------------- */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 z-[1]"
          width={layout.width}
          height={layout.height}
        >
          <defs>
            <linearGradient
              id="atlas-trail-grad"
              x1="0"
              y1="0"
              x2="0"
              y2={layout.height}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>

          {/* Locked trail: thick dashed purple→cyan, low opacity. */}
          <path
            d={ribbon}
            fill="none"
            stroke="url(#atlas-trail-grad)"
            strokeWidth={6}
            strokeDasharray="10 15"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.3}
            style={{ filter: "drop-shadow(0 0 5px rgba(168,85,247,0.45))" }}
          />

          {/* Flowing light running the whole path. */}
          <path
            d={ribbon}
            data-animate
            fill="none"
            stroke="#f5e8ff"
            strokeWidth={2.5}
            pathLength={1}
            strokeDasharray="0.04 0.96"
            strokeLinecap="round"
            opacity={0.85}
            className="atlas-trail-flow"
            style={{ filter: "drop-shadow(0 0 6px rgba(207,158,255,0.9))" }}
          />

          {/* Progress: completed draws in solid, active marches as a bright dash. */}
          {ordered.slice(1).map((node, index) => {
            const style = overlayStyle(node.status);
            if (!style) return null;
            return (
              <path
                key={`${node.key}-${node.status}`}
                d={trailSegmentPath(trail, index)}
                data-animate
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                pathLength={style.draw ? 1 : undefined}
                strokeDasharray={style.dash}
                strokeLinecap="round"
                className={`${style.className} ${style.draw ? "atlas-trail-draw" : ""}`}
                style={{
                  filter:
                    "drop-shadow(0 0 7px rgba(168,85,247,0.85))",
                }}
              />
            );
          })}
        </svg>

        {/* Sparkles sprinkled along the trail. */}
        {trail.map((p, i) =>
          i % 3 === 1 ? (
            <span
              key={`sp-${i}`}
              aria-hidden="true"
              data-animate
              className={`pointer-events-none absolute z-10 select-none text-[11px] ${
                i % 6 === 1 ? "text-cyan-200/80" : "text-violet-200/80"
              }`}
              style={{
                left: p.cx + (i % 2 === 0 ? -38 : 34),
                top: p.cy - 36,
                animation: `atlas-sparkle 3.2s ease-in-out ${i * 0.35}s infinite`,
              }}
            >
              ✦
            </span>
          ) : null,
        )}

        {/* -----------------------------------------------------------
            PHASE DIVIDERS: ribbon every 5 levels
        ----------------------------------------------------------- */}
        {dividers.map((d) => (
          <div
            key={d.key}
            data-animate
            className="pointer-events-none absolute inset-x-0 z-10 flex justify-center px-6"
            style={{
              top: d.y - 16,
              animation: "atlas-node-in 0.6s cubic-bezier(0.22,1,0.36,1) backwards",
              animationDelay: `${d.delay}ms`,
            }}
          >
            <div
              className={`flex w-full max-w-[540px] items-center gap-3 rounded-full border px-5 py-2 backdrop-blur-md ${
                d.complete
                  ? "border-[#a855f7]/45 bg-[#a855f7]/12 shadow-[0_0_24px_-8px_rgba(168,85,247,0.55)]"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span
                className={`shrink-0 text-[10px] font-black uppercase tracking-[0.28em] ${
                  d.complete ? "text-violet-200" : "text-[#cf9eff]"
                }`}
              >
                Phase {d.phaseNumber}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-[#a855f7]/60 to-cyan-400/30" />
              <span className="shrink-0 text-xs font-semibold text-white/85">
                {d.title}
                {d.complete ? " Complete!" : ""}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                  d.complete
                    ? "bg-[#a855f7]/25 text-violet-100"
                    : "bg-white/10 text-white/55"
                }`}
              >
                {d.done}/{d.total}
              </span>
            </div>
          </div>
        ))}

        {/* -----------------------------------------------------------
            LEVEL NODES + GLASS LEVEL CARDS
        ----------------------------------------------------------- */}
        {ordered.map((node, index) => {
          const point = layout.points.get(node.key);
          if (!point) return null;

          const isBoss = node.type === "boss";
          const selected = node.key === selectedKey;
          const locked = node.status === "locked";
          const completed = node.status === "completed";
          const active = node.status === "active";
          const size = point.size;
          const title = isBoss
            ? node.title.replace(/^boss battle:\s*/i, "") || node.title
            : node.title;
          // Labels ride toward the centre so they never sit on the path.
          const labelSide: "left" | "right" =
            point.cx < layout.width / 2 ? "right" : "left";

          const circleClass = completed
            ? "border-white/50 bg-[linear-gradient(135deg,#a855f7,#6366f1)] shadow-[0_0_26px_rgba(168,85,247,0.55),0_0_64px_rgba(99,102,241,0.3)]"
            : locked
              ? isBoss
                ? "border-rose-400/30 bg-[linear-gradient(135deg,#4c0f1e,#1e0c2c)] opacity-65 shadow-[0_0_14px_rgba(244,63,94,0.25)]"
                : "border-white/10 bg-[linear-gradient(135deg,#141422,#0a0a14)] opacity-60 shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
              : isBoss
                ? "border-rose-200/60 bg-[linear-gradient(135deg,#f43f5e,#a855f7)] shadow-[0_0_34px_rgba(244,63,94,0.55),0_0_90px_rgba(168,85,247,0.3)]"
                : "border-[#cf9eff]/75 bg-[linear-gradient(135deg,#2a1055,#160a36)] shadow-[0_0_30px_rgba(207,158,255,0.85),0_0_74px_rgba(168,85,247,0.45)]";

          const Icon = isBoss ? Skull : completed ? Check : locked ? Lock : Zap;

          // Tooltip opens away from the glass card and flips up near the bottom.
          const popupSide: PopupSide =
            point.cy > layout.height - 200 ? "top" : "bottom";
          const popupAlign: PopupAlign =
            point.cx < 120
              ? "left"
              : point.cx > layout.width - 120
                ? "right"
                : labelSide === "right"
                  ? "right"
                  : "left";

          return (
            <button
              key={node.key}
              type="button"
              data-animate
              onClick={() => onSelect(node.key)}
              aria-pressed={selected}
              aria-label={`Level ${node.levelNumber} · ${node.title} · ${STATUS_WORD[node.status]}`}
              style={{
                left: point.cx - size / 2,
                top: point.cy - size / 2,
                width: size,
                height: size,
                animation: "atlas-node-in 0.55s cubic-bezier(0.22,1,0.36,1) backwards",
                animationDelay: `${index * 45}ms`,
              }}
              className="group absolute z-30 hover:z-50 focus:z-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/70"
            >
              {/* Soft coloured underglow beneath the current level. */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-4 left-1/2 h-3.5 w-14 -translate-x-1/2 rounded-full bg-[#cf9eff]/70 blur-lg animate-pulse"
                />
              )}

              {/* Pulsing halo on the current level. */}
              {active && (
                <span
                  aria-hidden="true"
                  data-animate
                  className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-[#cf9eff]/70 atlas-node-ring"
                />
              )}

              <span
                className={`relative grid size-full place-items-center rounded-full border-2 backdrop-blur-md transition-[scale,filter,border-color] duration-200 group-hover:scale-110 group-hover:brightness-110 ${circleClass} ${
                  selected ? "scale-110 ring-2 ring-white/70" : ""
                }`}
              >
                <span className="flex flex-col items-center leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                  <Icon
                    className={
                      isBoss
                        ? "size-7 text-white"
                        : locked
                          ? "size-5 text-white/70"
                          : "size-5 text-white"
                    }
                    strokeWidth={2.4}
                  />
                  {!isBoss && (
                    <span className="mt-1 text-[9px] font-black tabular-nums tracking-tight text-white/90">
                      {node.levelNumber}
                    </span>
                  )}
                </span>
              </span>

              {/* Glassmorphism level card beside the node. */}
              <span
                className={`absolute top-1/2 w-40 -translate-y-1/2 text-left ${
                  labelSide === "right"
                    ? "left-[calc(100%+18px)]"
                    : "right-[calc(100%+18px)]"
                }`}
              >
                {isBoss && (
                  <span className="mb-1.5 flex w-fit items-center rounded-md border border-rose-400/60 bg-rose-500/25 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.45)] backdrop-blur-sm">
                    Boss Battle
                  </span>
                )}
                <span className="block rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)] backdrop-blur-md transition-[scale,box-shadow,border-color] duration-200 group-hover:scale-105 group-hover:border-white/25 group-hover:shadow-[0_14px_34px_-12px_rgba(168,85,247,0.65)]">
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/90">
                        {title}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-[9px] font-medium">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/55">
                      Lv {node.levelNumber}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/55">
                      {node.estimatedDays}d
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 ${BADGE_CLASS[node.status]}`}
                    >
                      {STATUS_WORD[node.status]}
                    </span>
                  </span>
                </span>
              </span>

              <Popup
                side={popupSide}
                align={popupAlign}
                title={
                  isBoss ? `Boss · Level ${node.levelNumber}` : `Level ${node.levelNumber}`
                }
                body={`${title} · ${node.estimatedDays} day${
                  node.estimatedDays === 1 ? "" : "s"
                } of focused practice. ${STATUS_WORD[node.status]}. Click to open.`}
              />
            </button>
          );
        })}
        </div>
      </div>
      </div>
    </div>
  );
}
