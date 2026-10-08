import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import type { MotionValue } from "framer-motion";
import { CurtainLink } from "../PageCurtain";
import {
  Bot,
  Brain,
  FileText,
  Map,
  Rocket,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const SEGMENTS = 7;
const SEG = 1 / SEGMENTS;
const ENTRY_MAG = 0.3;
const ENTRY_Y = 0.3;
const EXIT_Y = -0.8;
const CURVE_PULL = 0.85;
const PARTICLE_DELAYS = [0, 3, 6, 9];
// Slide runs over the same window as the fade so the header glides out over
// ~160px of scroll instead of slamming across it in 76px (the entry "jolt").
const HEADER_SHIFT_END = 0.03;
const HEADER_FADE: [number, number] = [0.012, 0.03];

interface Level {
  label: string;
  heading: string;
  body: string;
  /** Condensed copy for phones, where the text column is very narrow. */
  shortBody: string;
  icon: LucideIcon;
}

const LEVELS: Level[] = [
  {
    label: "Level 1",
    heading: "Tell Us Your Goal",
    body: "Start by telling our AI what you want to learn. Whether it's Python, Calculus, or Cybersecurity, just type your goal. Our AI analyzes your request and creates a custom learning plan designed specifically for you. No generic courses, no one-size-fits-all approach. Just your personal roadmap to mastery.",
    shortBody:
      "Type the skill you want - Python, Calculus or Cybersecurity. The AI builds a personal roadmap made only for you.",
    icon: Target,
  },
  {
    label: "Level 2",
    heading: "Get Your Custom Path",
    body: "Watch as AI builds your step-by-step roadmap in seconds. Each level is carefully planned with the right amount of content for daily learning. The path shows you exactly what to learn, in what order, and how long each step will take. It's like having a personal tutor who knows exactly where you are and where you need to go.",
    shortBody:
      "Your step-by-step path appears in seconds: what to learn, in which order, and how long each step takes.",
    icon: Map,
  },
  {
    label: "Level 3",
    heading: "Test Your Knowledge",
    body: "After completing lessons, challenge yourself with AI-generated quizzes. We create MCQs, coding challenges, debugging tests, and output prediction questions based on your course content. Pass each quiz to unlock the next level. Fail? No problem - review your notes and try again. Learning is about mastery, not memorization.",
    shortBody:
      "Take AI quizzes - MCQs, code and debugging. Pass to unlock the next level, or review and try again.",
    icon: Brain,
  },
  {
    label: "Level 4",
    heading: "Notes That Save Themselves",
    body: "Write notes as you learn, and watch them automatically save and organize. No more losing important information in random documents. Your notes are linked to specific topics and courses, so you can always find exactly what you need. Rich text formatting, auto-save, and smart organization - all in one place.",
    shortBody:
      "Notes save and organise themselves, linked to the exact topic you are studying.",
    icon: FileText,
  },
  {
    label: "Level 5",
    heading: "Your Personal AI Mentor",
    body: "Stuck on a concept? Chat with our AI that knows exactly what you're studying. It understands your courses, tracks your progress, and provides personalized help. Ask questions, get explanations, or request examples. It's like having a tutor available 24/7 who knows your learning journey inside and out.",
    shortBody:
      "Stuck on something? The AI mentor knows your courses and is available 24/7.",
    icon: Bot,
  },
  {
    label: "Level 6",
    heading: "Climb With Friends",
    body: "Learning alone is hard. Learning together is powerful. Invite friends to join your journey, compare streaks, and motivate each other. See who's studying right now, celebrate their victories, and borrow their momentum on days when yours runs low. Your squad keeps you accountable and makes the climb enjoyable.",
    shortBody:
      "Invite friends, compare streaks and keep each other accountable along the way.",
    icon: Users,
  },
  {
    label: "Level 7",
    heading: "The Mountain Is Waiting",
    body: "Your roadmap is ready. Your squad is waiting. Your timer is counting. The only thing left is to take the first step. Create your account in under a minute - no credit card, no setup, no excuses. Your journey to mastery starts with one click.",
    shortBody:
      "Roadmap ready, squad waiting. Create your account in under a minute and start.",
    icon: Rocket,
  },
];

interface Point {
  x: number;
  y: number;
}

const nodeX = (index: number, w: number) =>
  0.5 + (index % 2 === 0 ? 1 : -1) * (w >= 768 ? 0.18 : 0.22);

const nodeY = (index: number) =>
  (50 + (index + 0.65) * (((SEGMENTS - 1) * 100) / SEGMENTS)) /
  (SEGMENTS * 100);

const quad = (t: number, a: Point, b: Point, c: Point): Point => {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
};

const catmullRom = (points: Point[]): string => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    d +=
      ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6},` +
      ` ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6},` +
      ` ${p2.x} ${p2.y}`;
  }
  return d;
};

const orderedStops = (values: number[]) => {
  let prev = -Infinity;
  return values.map((v) => {
    const next = Math.max(v, prev + 1e-4);
    prev = next;
    return next;
  });
};

/**
 * Scroll progress at which node `i` sits in the middle of the sticky
 * viewport — the spot where the level copy is pinned. Derived from the
 * section/sticky geometry so it stays exact on phones (100dvh) too.
 */
const centreMoment = (i: number, h: number, sh: number) => {
  const span = h - sh;
  if (span <= 0) return nodeY(i);
  return Math.min(1, Math.max(0, (nodeY(i) * h - sh / 2) / span));
};

/** Piecewise-linear map of `v` through ascending stops → values. */
const mapPiecewise = (v: number, stops: number[], values: number[]) => {
  if (v <= stops[0]) return values[0];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i]) {
      const span = stops[i] - stops[i - 1];
      const t = span > 0 ? (v - stops[i - 1]) / span : 0;
      return values[i - 1] + t * (values[i] - values[i - 1]);
    }
  }
  return values[values.length - 1];
};

interface LevelTextProps {
  index: number;
  progress: MotionValue<number>;
  /** Scroll point where this node lights up on the path (same value the
   *  node itself uses) so copy and node stay in lockstep. */
  frac: number;
  w: number;
  vh: number;
}

function LevelText({ index, progress, frac, w, vh }: LevelTextProps) {
  const level = LEVELS[index];
  const isCta = index === SEGMENTS - 1;
  // Levels 2 & 3 read better left-aligned; the rest stay centred.
  const alignment = index === 1 || index === 2 ? "text-left" : "text-center";

  // Phones: the text column sits close to both screen edges, so copy enters
  // with a short glide instead of flying in from outside the page.
  const compact = w > 0 && w < 768;
  const entryMag = compact ? 0.05 : ENTRY_MAG;
  const entryY = compact ? 0.08 : ENTRY_Y;
  const exitY = compact ? -0.18 : EXIT_Y;

  const end: Point = { x: (0.5 - nodeX(index, w)) * w, y: 0 };
  const side = end.x >= 0 ? 1 : -1;
  const start: Point = { x: side * entryMag * w, y: entryY * vh };
  const ctrl: Point = {
    x: start.x + CURVE_PULL * (end.x - start.x),
    y: start.y,
  };

  // Timeline is anchored to `frac` (where the drawn line reaches this node):
  // copy fades in as the line approaches and lands exactly on the node's
  // position the moment it lights (stop 0.45 ≈ the node's centre moment in
  // window space), then holds past the node and leaves before the next one.
  const winStart = Math.max(0, frac - 0.5 * SEG);
  const winEnd = Math.min(1, frac + 0.6 * SEG);
  const win = Math.max(winEnd - winStart, 1e-3);
  const at = (k: number) => winStart + k * win;

  const stops = [0, 0.07, 0.14, 0.21, 0.28, 0.36, 0.45, 0.6, 0.78, 1].map(at);
  const xs = [
    start.x,
    start.x,
    quad(0.2, start, end, ctrl).x,
    quad(0.4, start, end, ctrl).x,
    quad(0.6, start, end, ctrl).x,
    quad(0.8, start, end, ctrl).x,
    end.x,
    end.x,
    end.x,
    start.x,
  ];
  const ys = [
    start.y + 100,
    start.y,
    quad(0.2, start, end, ctrl).y,
    quad(0.4, start, end, ctrl).y,
    quad(0.6, start, end, ctrl).y,
    quad(0.8, start, end, ctrl).y,
    0,
    0,
    0,
    exitY * vh,
  ];
  const fadeStops = [0, 0.45, 0.8, 0.97].map(at);

  // No spring on the copy either: like the drawn line, position tracks
  // scroll 1:1 so the text can never lag behind the node it belongs to.
  const x = useTransform(progress, stops, xs);
  const y = useTransform(progress, stops, ys);
  const opacity = useTransform(progress, fadeStops, [0, 1, 1, 0]);
  const blur = useTransform(progress, fadeStops, [7, 0, 0, 6]);
  const scale = useTransform(
    progress,
    fadeStops,
    compact ? [0.9, 1, 1, 0.95] : [1, 1, 1, 1],
  );
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${alignment}`}
      style={{ width: Math.min(420, 0.56 * w - 16) }}
    >
      <motion.div style={{ x, y, opacity, filter, scale }}>
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.26em] text-[#cf9eff] sm:text-[0.8125rem] sm:tracking-[0.3em]">
          {level.label}
        </span>
        <h3 className="mt-2.5 text-[1.25rem] font-bold leading-tight text-white sm:mt-3 sm:text-[1.75rem]">
          {level.heading}
        </h3>
        <p className="mt-2.5 text-[0.8125rem] leading-[1.55] text-gray-400 sm:mt-3 sm:text-[1rem] sm:leading-[1.6]">
          <span className="sm:hidden">{level.shortBody}</span>
          <span className="hidden sm:inline">{level.body}</span>
        </p>
        {isCta && (
          <CurtainLink
            to="/login"
            className="pointer-events-auto mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-[#4044CC] shadow-[0_0_14px_rgba(207,158,255,0.3)] transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_44px_rgba(207,158,255,0.9)] sm:mt-6 sm:px-7 sm:py-3 sm:text-sm sm:shadow-[0_0_28px_rgba(207,158,255,0.55)]"
          >
            Create Your Account
          </CurtainLink>
        )}
      </motion.div>
    </div>
  );
}

interface LevelNodeProps {
  index: number;
  frac: number;
  progress: MotionValue<number>;
  w: number;
  reduced: boolean;
}

function LevelNode({ index, frac, progress, w, reduced }: LevelNodeProps) {
  const Icon = LEVELS[index].icon;

  const stops = orderedStops([
    0,
    frac - 0.02,
    Math.min(frac + 0.03, 0.985),
    Math.min(frac + 0.08, 0.995),
    1,
  ]);

  const nodeOpacity = useTransform(progress, stops, [0.4, 0.4, 1, 1, 1]);
  const fill = useTransform(progress, stops, [0, 0, 1, 1, 1]);
  const scale = useTransform(progress, stops, [1, 1, 1.18, 1, 1]);
  const glow = useTransform(
    progress,
    stops,
    reduced ? [0, 0, 14, 8, 8] : [0, 0, 26, 12, 12],
  );
  const boxShadow = useMotionTemplate`0 0 ${glow}px rgba(207,158,255,0.85)`;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${nodeX(index, w) * 100}%`,
        top: `${nodeY(index) * 100}%`,
      }}
    >
      <motion.div
        className="relative flex size-[46px] items-center justify-center rounded-full border border-white/15 sm:size-[60px]"
        style={{
          opacity: nodeOpacity,
          scale: reduced ? 1 : scale,
          boxShadow,
        }}
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#241a52] to-[#120b30]" />
        <motion.span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[#cf9eff] to-[#5b47d4]"
          style={{ opacity: fill }}
        />
        <Icon className="relative size-5 text-white sm:size-6" strokeWidth={2} />
      </motion.div>
    </div>
  );
}

export function CompleteJourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const [dims, setDims] = useState({ w: 0, h: 0, sh: 0 });
  const [nodeFracs, setNodeFracs] = useState<number[]>([]);
  const [headerBox, setHeaderBox] = useState({ w: 0, pad: 24 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // scroll → drawn path length. Keyed through the nodes' centre moments so
  // the tip ignites each node exactly when it reaches screen centre (see
  // drawMap below). Held in a ref so late measurements always apply.
  const drawRaw = useMotionValue(0);
  const drawMap = useRef<{ stops: number[]; values: number[] }>({
    stops: [0, 1],
    values: [0, 1],
  });
  const tipX = useMotionValue(0);
  const tipY = useMotionValue(0);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return;
    const sync = () => {
      const sr = section.getBoundingClientRect();
      const cr = sticky.getBoundingClientRect();
      setDims((prev) =>
        prev.w === sr.width && prev.h === sr.height && prev.sh === cr.height
          ? prev
          : { w: sr.width, h: sr.height, sh: cr.height },
      );
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(section);
    observer.observe(sticky);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const el = headerRef.current;
      if (!el) return;
      const pad =
        parseFloat(
          window.getComputedStyle(el.parentElement ?? el).paddingLeft,
        ) || 0;
      setHeaderBox({ w: el.offsetWidth, pad });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const { w, h, sh } = dims;
  const vh = sh > 0 ? sh : h / SEGMENTS;
  const ready = w > 0 && h > 0 && sh > 0;

  // Measured path-length fraction per node; falls back to the node's y
  // fraction until the path has been sampled once.
  const fracs = LEVELS.map((_, i) => nodeFracs[i] ?? nodeY(i));

  // Phones get a lighter particle trail (two dots instead of four).
  const particleDelays = w > 0 && w < 768 ? [0, 6] : PARTICLE_DELAYS;

  // scroll → drawn length, anchored so draw = frac[i] lands exactly on the
  // scroll where node i crosses the viewport centre.
  drawMap.current = {
    stops: [0, ...LEVELS.map((_, i) => centreMoment(i, h, sh)), 1],
    values: [0, ...fracs, 1],
  };

  useEffect(() => {
    const m = drawMap.current;
    drawRaw.set(mapPiecewise(scrollYProgress.get(), m.stops, m.values));
  }, [ready, w, h, sh, nodeFracs]);

  // No spring on purpose: the drawn line must track scroll 1:1. A spring
  // here lags ~500px behind during fast scrolling and then snaps to the
  // target when you stop — that catch-up was the visible "line jumps, then
  // settles" glitch on entry.
  const draw = drawRaw;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const m = drawMap.current;
    drawRaw.set(mapPiecewise(v, m.stops, m.values));
  });

  const waypoints: Point[] = ready
    ? [
        { x: w * 0.5, y: 0 },
        ...LEVELS.map((_, i) => ({ x: nodeX(i, w) * w, y: nodeY(i) * h })),
        { x: w * 0.5, y: h },
      ]
    : [];

  useEffect(() => {
    const p = pathRef.current;
    if (!ready || !p) return;
    const total = p.getTotalLength();
    if (!total) return;
    const N = 500;
    const samples: Point[] = [];
    for (let i = 0; i <= N; i++) {
      const pt = p.getPointAtLength((total * i) / N);
      samples.push({ x: pt.x, y: pt.y });
    }
    setNodeFracs(
      LEVELS.map((_, i) => {
        const tx = nodeX(i, w) * w;
        const ty = nodeY(i) * h;
        let best = 0;
        let bestD = Infinity;
        for (let j = 0; j <= N; j++) {
          const dx = samples[j].x - tx;
          const dy = samples[j].y - ty;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        }
        return best / N;
      }),
    );
  }, [ready, w, h]);

  const placeTip = (v: number) => {
    const p = pathRef.current;
    if (!p) return;
    const total = p.getTotalLength();
    if (!total) return;
    const pt = p.getPointAtLength(total * Math.min(Math.max(v, 0), 1));
    tipX.set(pt.x);
    tipY.set(pt.y);
  };

  useEffect(() => {
    if (ready) placeTip(draw.get());
  }, [ready, w, h]);
  useMotionValueEvent(draw, "change", placeTip);

  const tipOpacity = useTransform(draw, [0, 0.02, 0.98, 1], [0, 1, 1, 0]);
  const particleOpacity = useTransform(draw, [0, 0.04, 1], [0, 1, 1]);

  const headerOffset =
    w > 0 && headerBox.w > 0
      ? Math.max(0, (w - headerBox.w) / 2 - headerBox.pad)
      : 0;
  // Scroll-driven with no spring: header motion stays 1:1 with the wheel, so
  // it can never lag and then snap while the section fades it out.
  const headerX = useTransform(
    scrollYProgress,
    [0, HEADER_SHIFT_END],
    [headerOffset, 0],
  );
  const headerOut = useTransform(scrollYProgress, HEADER_FADE, [0, 1]);
  const headerOpacity = useTransform(headerOut, [0, 1], [1, 0]);
  const headerY = useTransform(headerOut, [0, 1], [0, -28]);

  return (
    <section
      id="complete-journey"
      ref={sectionRef}
      className="relative h-[600vh] w-full bg-[#04040a]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {ready && (
          <svg
            className="absolute inset-0 h-full w-full"
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
          >
            <defs>
              <radialGradient id="cj-tip-glow">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="30%" stopColor="#cf9eff" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#cf9eff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="rgba(150,110,255,0.05)"
              strokeWidth={32}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="rgba(150,110,255,0.06)"
              strokeWidth={27}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="rgba(150,110,255,0.07)"
              strokeWidth={23}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="rgba(150,110,255,0.08)"
              strokeWidth={19}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="rgba(150,110,255,0.10)"
              strokeWidth={15}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="rgba(150,110,255,0.12)"
              strokeWidth={12}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              ref={pathRef}
              id="cj-path"
              d={catmullRom(waypoints)}
              fill="none"
              stroke="#35278f"
              strokeWidth={9}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            <motion.path
              d={catmullRom(waypoints)}
              fill="none"
              stroke="#cf9eff"
              strokeWidth={3}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />
            {!reduced &&
              particleDelays.map((delay, i) => (
                <motion.g key={delay} style={{ opacity: particleOpacity }}>
                  <circle
                    r={9}
                    fill={i % 2 === 0 ? "#cf9eff" : "#9db4ff"}
                    opacity={0.3}
                  />
                  <circle
                    r={4}
                    fill={i % 2 === 0 ? "#cf9eff" : "#9db4ff"}
                  />
                  <animateMotion
                    dur="12s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href="#cj-path" />
                  </animateMotion>
                </motion.g>
              ))}
            <motion.g style={{ x: tipX, y: tipY, opacity: tipOpacity }}>
              <circle r={26} fill="url(#cj-tip-glow)" />
              <circle r={4.5} fill="#ffffff" />
            </motion.g>
          </svg>
        )}
        {ready &&
          LEVELS.map((_, i) => (
            <LevelNode
              key={i}
              index={i}
              frac={fracs[i]}
              progress={draw}
              w={w}
              reduced={reduced}
            />
          ))}
      </div>

      <div
        ref={stickyRef}
        className="pointer-events-none sticky top-0 z-20 h-[100dvh] w-full overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(120,80,255,0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_35%_at_80%_80%,rgba(157,180,255,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_30%_at_15%_55%,rgba(207,158,255,0.1),transparent_70%)]" />

        <header className="absolute inset-x-0 top-[7%] z-10 px-6 sm:px-12">
            <motion.div ref={headerRef} className="max-w-2xl text-left" style={{ x: headerX, opacity: headerOpacity, y: headerY }}>
              <ScrollReveal distance={20}>
                <p className="bg-gradient-to-r from-[#7c5cff] via-[#b794ff] to-[#cf9eff] bg-clip-text text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-transparent [filter:drop-shadow(0_0_14px_rgba(207,158,255,0.4))] sm:text-[0.875rem] sm:tracking-[0.2em]">
                  What We Offer
                </p>
              </ScrollReveal>
              <ScrollReveal distance={30} className="mt-4">
                <h2 className="text-[1.625rem] font-bold leading-[1.1] text-white sm:text-[2.25rem] lg:text-5xl">
                  Everything You Need to Master Any Subject
                </h2>
              </ScrollReveal>
              <ScrollReveal distance={30} className="mt-4">
                <p className="max-w-xl text-[0.875rem] leading-relaxed text-gray-400 sm:text-[1.125rem]">
                  From your first goal to your final boss battle, ATLAS guides
                  every step of your journey.
                </p>
              </ScrollReveal>
            </motion.div>
        </header>

        {ready &&
          LEVELS.map((_, i) => (
            <LevelText
              key={i}
              index={i}
              progress={draw}
              frac={fracs[i]}
              w={w}
              vh={vh}
            />
          ))}
      </div>
    </section>
  );
}
