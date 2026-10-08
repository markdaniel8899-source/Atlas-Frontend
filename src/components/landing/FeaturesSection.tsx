import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowUpRight,
  Brain,
  CalendarDays,
  FileText,
  Timer,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ScrollWords } from "../ScrollWords";
import { EASE } from "../../lib/motion";
import { ScrollReveal } from "./ScrollReveal";

const FEATURES = [
  {
    icon: Timer,
    title: "Focus Timer",
    body: "Start your work and let the timer run. You can close the tab and come back later. Your time is always saved.",
    short: "Start a timer and focus. Close the tab anytime — your time is saved.",
  },
  {
    icon: FileText,
    title: "Smart Notes",
    body: "A simple writing space next to your timer. Write your ideas and they are saved automatically as you type.",
    short: "Write next to your timer. Notes save automatically as you type.",
  },
  {
    icon: CalendarDays,
    title: "Progress Map",
    body: "See how consistent you are. A simple calendar shows every day you worked and tracks your real progress.",
    short: "A calendar shows every day you worked and your real progress.",
  },
  {
    icon: Users,
    title: "Team Tracking",
    body: "Work with your friends or team. Share your focus hours and stay motivated by seeing their progress.",
    short: "Share focus hours with friends and stay motivated together.",
  },
];

const WEEK = [38, 62, 45, 80, 55, 92, 70];

const FOCUS_FLOW = 78;
const COUNT_DURATION = 1.5;

const INSIGHTS = [
  { icon: Brain, label: "Retention", value: "94% (High)" },
  { icon: Zap, label: "Focus Score", value: "8.5/10" },
  { icon: TrendingUp, label: "Mastery Gain", value: "+12% today" },
];

interface TiltCardProps {
  item: (typeof FEATURES)[number];
}

function TiltCard({ item }: TiltCardProps) {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 240, damping: 18, mass: 0.4 });
  const rotateY = useSpring(ry, { stiffness: 240, damping: 18, mass: 0.4 });
  const glareX = useTransform(ry, [-11, 11], ["16%", "84%"]);
  const glareY = useTransform(rx, [-11, 11], ["84%", "16%"]);
  const glare = useMotionTemplate`radial-gradient(300px circle at ${glareX} ${glareY}, rgba(157,180,255,0.22), transparent 62%)`;

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - rect.left) / rect.width - 0.5) * 22);
    rx.set(-((e.clientY - rect.top) / rect.height - 0.5) * 22);
  };

  const handleLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={
        reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }
      }
      className="group glass card-sheen relative isolate h-full rounded-2xl p-4 will-change-transform sm:p-6"
    >
      <motion.span
        aria-hidden="true"
        style={{ background: glare }}
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="relative flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-star sm:size-11">
        <item.icon className="size-5" />
      </span>
      <h3 className="relative mt-3 text-[14px] font-semibold tracking-tight text-white sm:mt-4 sm:text-base">
        {item.title}
      </h3>
      <p className="relative mt-2 text-[12.5px] leading-snug text-white/45 sm:text-sm sm:leading-relaxed">
        <span className="sm:hidden">{item.short}</span>
        <span className="hidden sm:inline">{item.body}</span>
      </p>
      <span className="relative mt-4 hidden items-center gap-1 text-xs font-medium text-star/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex">
        Explore
        <ArrowUpRight className="size-3.5" />
      </span>
    </motion.div>
  );
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const ringInView = useInView(ringRef, { once: true, amount: 0.4 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ringInView) return;
    if (reduced) {
      setCount(FOCUS_FLOW);
      return;
    }
    const controls = animate(0, FOCUS_FLOW, {
      duration: COUNT_DURATION,
      ease: EASE,
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return () => controls.stop();
  }, [ringInView, reduced]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "start 30%"],
  });

  const { scrollYProgress: visualProgress } = useScroll({
    target: visualRef,
    offset: ["start end", "end start"],
  });
  const rotateY = useTransform(visualProgress, [0, 1], [16, -16]);
  const rotateX = useTransform(visualProgress, [0, 1], [-7, 7]);
  const visualY = useTransform(visualProgress, [0, 1], [44, -44]);

  return (
    <div
      ref={ref}
      className="relative flex min-h-screen w-full flex-col justify-center gap-10 px-6 py-16 sm:gap-14 sm:px-10 sm:py-24 lg:px-16"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <ScrollReveal distance={36} exit>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-star/70 sm:tracking-[0.45em]">
              The instrument
            </p>
          </ScrollReveal>
          <h2 className="mt-4 text-4xl font-extrabold leading-[0.95] tracking-tighter text-white sm:text-6xl lg:text-7xl">
            <ScrollWords
              text="Your mind, finally in one place."
              progress={scrollYProgress}
            />
          </h2>
          <ScrollReveal distance={44} exit className="mt-6 max-w-md">
            <p className="text-[13px] leading-relaxed text-white/55 sm:text-sm lg:text-base">
              A clean space for your work. No clutter and no distractions. Just
              your focus, your notes, and your progress in one place.
            </p>
          </ScrollReveal>
          <ScrollReveal
            distance={30}
            direction="left"
            exit
            className="mt-7 flex flex-wrap gap-2"
          >
            {["Minimal setup", "Offline ready", "Auto sync"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55"
              >
                {chip}
              </span>
            ))}
          </ScrollReveal>
        </div>

        <ScrollReveal distance={64} scale={0.92} exit className="relative">
          <motion.div ref={visualRef} className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(circle,rgba(120,140,255,0.45),transparent_65%)] blur-3xl"
          />
          <motion.div
            style={
              reduced
                ? undefined
                : { rotateX, rotateY, y: visualY, transformPerspective: 1400 }
            }
            className="relative will-change-transform"
          >
            <motion.div
              whileHover={reduced ? undefined : { rotateX: 2, rotateY: -2 }}
              style={{ transformPerspective: 1200 }}
              className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.95)] backdrop-blur-2xl will-change-transform sm:p-6"
            >
              {/* Gradient hairline along the top edge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(207,158,255,0.9),#ffffff,rgba(207,158,255,0.9),transparent)]"
              />
              {/* Inner glow pooling from the top edge */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(120%_150%_at_50%_0%,rgba(150,110,255,0.18),transparent_62%)]"
              />

              {/* Window chrome */}
              <div className="relative flex items-center gap-2 border-b border-white/[0.08] pb-4">
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/10" />
                <span className="ml-2 truncate font-mono text-[11px] text-white/40">
                  atlas.app / focus.run
                </span>
              </div>

              {/* Focus flow ring */}
              <div className="relative mt-6 flex flex-col items-center">
                <div ref={ringRef} className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(207,158,255,0.4),transparent_68%)] blur-2xl"
                  />
                  <svg
                    viewBox="0 0 184 184"
                    className="relative h-44 w-44 sm:h-48 sm:w-48"
                    role="img"
                    aria-label="Focus flow: 78 percent"
                  >
                    <defs>
                      <linearGradient
                        id="focus-ring-gradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#CF9EFF" />
                        <stop offset="100%" stopColor="#9DB4FF" />
                      </linearGradient>
                    </defs>
                    {/* HUD tick ring */}
                    <circle
                      cx="92"
                      cy="92"
                      r="86"
                      fill="none"
                      stroke="rgba(157,180,255,0.35)"
                      strokeWidth="1"
                      strokeDasharray="1.5 7"
                    />
                    {/* Track */}
                    <circle
                      cx="92"
                      cy="92"
                      r="74"
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="10"
                    />
                    {/* Progress */}
                    <motion.circle
                      cx="92"
                      cy="92"
                      r="74"
                      fill="none"
                      stroke="url(#focus-ring-gradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      transform="rotate(-90 92 92)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: ringInView ? 0.78 : 0 }}
                      transition={{
                        duration: reduced ? 0 : COUNT_DURATION,
                        ease: EASE,
                      }}
                      style={{
                        filter: "drop-shadow(0 0 10px rgba(207,158,255,0.7))",
                      }}
                    />
                  </svg>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={ringInView ? { opacity: 1, y: 0 } : undefined}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <span className="font-mono text-4xl font-medium tabular-nums tracking-tight text-white sm:text-5xl">
                      {count}%
                    </span>
                    <span className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.32em] text-star/80">
                      Focus Flow
                    </span>
                  </motion.div>
                </div>
                <ScrollReveal distance={30} className="mt-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/45">
                    Deep Work Session
                  </p>
                </ScrollReveal>
              </div>

              {/* AI insights */}
              <div className="relative mt-6">
                <ScrollReveal distance={30}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/35">
                    AI insights
                  </p>
                </ScrollReveal>
                <div className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
                  {INSIGHTS.map((insight, i) => (
                    <ScrollReveal
                      key={insight.label}
                      from={i * 0.18}
                      to={i * 0.18 + 0.6}
                      distance={34}
                      scale={0.9}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-3 sm:px-3"
                    >
                      <span className="flex size-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-star">
                        <insight.icon className="size-3" />
                      </span>
                      <p className="mt-2.5 text-[9px] uppercase tracking-[0.16em] text-white/35">
                        {insight.label}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold leading-tight text-white">
                        {insight.value}
                      </p>
                    </ScrollReveal>
                  ))}
                </div>
              </div>

              {/* Weekly bars */}
              <div className="relative mt-6 hidden items-end gap-1.5 sm:flex">
                {WEEK.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scaleY: 0 }}
                    whileInView={{ opacity: 1, scaleY: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{
                      duration: 0.6,
                      delay: 0.35 + i * 0.07,
                      ease: EASE,
                    }}
                    style={{
                      height: `${h * 0.34}px`,
                      transformOrigin: "bottom",
                    }}
                    className={`flex-1 rounded-full ${
                      i === 5
                        ? "bg-[#cf9eff] shadow-[0_0_16px_rgba(207,158,255,0.9)]"
                        : "bg-white/15"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
          </motion.div>
        </ScrollReveal>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {FEATURES.map((item, i) => (
          <ScrollReveal
            key={item.title}
            from={i * 0.15}
            to={i * 0.15 + 0.55}
            distance={72}
            scale={0.9}
            exit
          >
            <TiltCard item={item} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
