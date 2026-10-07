import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, Flame, Target, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { curtainNavigate } from "../PageCurtain";
import ShinyText from "../ShinyText";
import { Button } from "../ui/Button";
import { EASE } from "../../lib/motion";
import LaserFlow from "../effects/LaserFlow";

type Stat = {
  icon: typeof Zap;
  label: string;
  value: string;
  trend?: boolean;
  progress?: number;
};

const STATS: Stat[] = [
  { icon: Zap, label: "Focus Time", value: "12h 40m", trend: true },
  { icon: Flame, label: "Current Streak", value: "14 Days" },
  { icon: Target, label: "Weekly Mastery", value: "78%", progress: 78 },
];

/** Wide glass widget that straddles the hero / next-section boundary. */
function HeroWidget({ intro }: { intro: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-auto relative flex h-full min-h-[9rem] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-[0_60px_120px_-50px_rgba(0,0,0,1)] backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-2 hover:border-white/25 hover:bg-black/25 hover:shadow-[0_70px_140px_-50px_rgba(0,0,0,1)]"
    >
      {/* Impact hairline on the top edge */}
      <div className="absolute top-0 left-1/2 h-px w-[70%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(207,158,255,0.95),#ffffff,rgba(207,158,255,0.95),transparent)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_140%_at_50%_0%,rgba(150,110,255,0.3),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(3,3,5,0.55)_100%)]"
      />

      {/* Widget chrome */}
      <div className="relative flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5 sm:px-6 sm:py-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/55">
          Atlas overview
        </span>
        <span className="text-[10px] uppercase tracking-[0.24em] text-white/30">
          This week
        </span>
      </div>

      {/* Three data points */}
      <div className="relative grid flex-1 grid-cols-3 divide-x divide-white/[0.07]">
        {STATS.map((stat, statIndex) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={
                intro ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }
              }
              transition={{
                duration: 0.7,
                delay: 1.4 + statIndex * 0.12,
                ease: EASE,
              }}
              className="flex min-w-0 flex-col justify-center gap-1.5 px-2.5 py-3 sm:gap-2.5 sm:px-6 sm:py-4"
            >
              <div className="flex items-center gap-2 text-white/45">
                <Icon className="size-3.5 shrink-0 text-[#cf9eff]" />
                <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] sm:text-[10px] sm:tracking-[0.2em]">
                  {stat.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-outfit text-base leading-none font-semibold text-white tabular-nums sm:text-2xl">
                  {stat.value}
                </span>
                {stat.trend && (
                  <TrendingUp className="size-3.5 shrink-0 text-emerald-400" />
                )}
              </div>

              {stat.progress !== undefined && (
                <div className="h-1 w-full max-w-[9rem] overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#cf9eff,#ffffff)]"
                    initial={{ width: reduced ? `${stat.progress}%` : 0 }}
                    animate={{
                      width: intro ? `${stat.progress}%` : 0,
                    }}
                    transition={{ duration: 1.1, delay: 2, ease: EASE }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface HeroProps {
  /** Flips to true when the curtain starts opening. */
  intro?: boolean;
}

export function Hero({ intro = true }: HeroProps) {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Scroll transition: the copy lifts and fades as the hero leaves, so the
  // fold reads as one continuous move instead of scrolling out raw.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -72]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scrollStyle = reduced
    ? undefined
    : { y: contentY, opacity: contentOpacity };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[95vh] w-full bg-void"
    >
      {/* Left-column bloom. Kept to the left half so it never touches the beam column. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(46%_58%_at_16%_46%,rgba(64,68,204,0.24),transparent_72%)]"
      />

      {/* ─────────────── RIGHT · FULL-LENGTH BEAM + OVERLAPPING CARD ─────────────── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 block"
        initial={{ opacity: 0 }}
        animate={{ opacity: intro ? 1 : 0 }}
        transition={{ duration: 1.4, delay: intro ? 0.2 : 0, ease: EASE }}
      >
        <div className="absolute right-4 bottom-0 left-4 translate-y-[15%] sm:right-[6%] sm:left-auto sm:h-[9.5rem] sm:w-[70%] sm:max-w-3xl sm:translate-y-[60%] lg:right-[4%] lg:w-[60%]">
          {/*
            Beam container: bottom edge = the card's top edge, top edge 130vh above it.
            The shader fades over ~0.73 of its own height, so at 130vh the beam is
            still lit at the hero's top-0 and falls the whole way onto the card.
          */}
          <div
            className="pointer-events-none absolute bottom-full left-[72%] w-[130%] -translate-x-1/2 sm:left-1/2"
            style={{ top: "-130vh" }}
          >
            <LaserFlow
              color="#CF9EFF"
              backgroundColor="#030305"
              horizontalBeamOffset={0}
              verticalBeamOffset={-0.5}
              horizontalSizing={1.35}
              verticalSizing={2}
              wispDensity={1}
              wispSpeed={15}
              wispIntensity={10}
              flowSpeed={0.35}
              flowStrength={0.25}
              fogIntensity={0.4}
              fogScale={0.4}
              fogFallSpeed={0.78}
              decay={1.1}
              falloffStart={1.5}
            />
          </div>

          <HeroWidget intro={intro} />
        </div>
      </motion.div>

      <div className="pointer-events-none relative z-20 mx-auto grid min-h-[95vh] w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-36 pb-44 sm:pb-24 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
        {/* ─────────────── LEFT · CONTENT ─────────────── */}
        <motion.div
          style={scrollStyle}
          className="pointer-events-auto flex max-w-xl flex-col items-start gap-6 text-left"
        >
          <div className="shrink-0 overflow-hidden">
            <motion.p
              initial={{ y: "130%", opacity: 0 }}
              animate={intro ? { y: 0, opacity: 1 } : { y: "130%", opacity: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: EASE }}
              className="text-[10px] font-medium uppercase tracking-[0.3em] text-star/75 sm:tracking-[0.5em]"
            >
              AI-powered learning OS
            </motion.p>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={intro ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: 1.1, delay: 0.4, ease: EASE }}
            className="font-outfit text-4xl leading-[1.02] tracking-[0.03em] uppercase sm:text-5xl lg:text-6xl"
          >
            <span className="font-light text-white/85">
              <ShinyText
                text="YOUR MAP FOR"
                speed={5}
                delay={0}
                color="#ffffff"
                shineColor="#cf9eff"
                spread={120}
                direction="left"
                disabled={!intro}
              />
            </span>{" "}
            <span className="font-extrabold">
              <ShinyText
                text="MASTERY."
                speed={5}
                delay={0}
                color="#ffffff"
                shineColor="#cf9eff"
                spread={120}
                direction="left"
                disabled={!intro}
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={intro ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.95, delay: 1, ease: EASE }}
            className="max-w-lg text-sm leading-relaxed text-gray-300 sm:text-base"
          >
            Stop jumping between Notion, Anki, and YouTube. ATLAS is your
            all-in-one AI Learning OS.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={intro ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.95, delay: 1.2, ease: EASE }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <Button
              onClick={() => curtainNavigate(navigate, "/login")}
              className="w-full justify-center sm:w-auto"
            >
              Start your ascent
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => curtainNavigate(navigate, "/login")}
              className="w-full sm:w-auto"
            >
              I already train here
            </Button>
          </motion.div>
        </motion.div>

        {/* Right grid cell: the widget is absolutely placed at the hero bottom. */}
        <div className="hidden lg:block" />
      </div>
    </section>
  );
}
