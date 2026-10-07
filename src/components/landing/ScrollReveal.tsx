import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

type RevealDirection = "up" | "down" | "left" | "right";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Progress window start (0-1) inside the entry phase — slice it so
   *  siblings in the same row reveal one after another. */
  from?: number;
  /** Progress window end (0-1) inside the entry phase. */
  to?: number;
  /** Slide travel (px) at entry — the distance it starts from. */
  distance?: number;
  /** Which side it slides in from. "up" = rises from below. */
  direction?: RevealDirection;
  /** Scale at entry; 1 disables the zoom. */
  scale?: number;
  /** Entry tilt (deg) that settles back to 0. */
  rotate?: number;
  /** Also slide + fade out while scrolling past the top. */
  exit?: boolean;
}

/** In exit mode the reveal is compressed into the first 35% of the full
 *  pass so it completes long before the exit window opens. */
const ENTRY_END = 0.35;
const EXIT_START = 0.86;

/**
 * Scroll-linked reveal: maps the element's own scroll progress to
 * opacity + slide + scale + tilt. Everything is driven by the wheel (live
 * and reversible) rather than a one-shot timer, and the optional `exit`
 * pass slides the element back out as it leaves through the top.
 */
export function ScrollReveal({
  children,
  className = "",
  from = 0,
  to = 1,
  distance = 48,
  direction = "up",
  scale = 1,
  rotate = 0,
  exit = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: exit ? ["start end", "end start"] : ["start 92%", "start 45%"],
  });

  const compressed = useTransform(scrollYProgress, [0, ENTRY_END], [0, 1]);
  const entry = exit ? compressed : scrollYProgress;

  const opacityIn = useTransform(entry, [from, to], [0, 1]);
  const xIn = useTransform(
    entry,
    [from, to],
    direction === "left"
      ? [-distance, 0]
      : direction === "right"
        ? [distance, 0]
        : [0, 0],
  );
  const yIn = useTransform(
    entry,
    [from, to],
    direction === "up"
      ? [distance, 0]
      : direction === "down"
        ? [-distance, 0]
        : [0, 0],
  );
  const scaleIn = useTransform(entry, [from, to], [scale, 1]);
  const rotateIn = useTransform(entry, [from, to], [rotate, 0]);

  // Exit half — the ranges collapse to identity values when `exit` is off,
  // so enter-only reveals are untouched.
  const exitStops: [number, number] = exit ? [EXIT_START, 1] : [1.001, 1.002];
  const opacityOut = useTransform(scrollYProgress, exitStops, [1, 0]);
  const yOut = useTransform(scrollYProgress, exitStops, [0, -distance * 0.6]);
  const scaleOut = useTransform(scrollYProgress, exitStops, [1, 0.94]);

  const opacity = useTransform(
    [opacityIn, opacityOut],
    (v: number[]) => v[0] * v[1],
  );
  const y = useTransform([yIn, yOut], (v: number[]) => v[0] + v[1]);
  const scaleValue = useTransform(
    [scaleIn, scaleOut],
    (v: number[]) => v[0] * v[1],
  );

  return (
    <motion.div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={
        reduced
          ? undefined
          : { opacity, x: xIn, y, scale: scaleValue, rotate: rotateIn }
      }
    >
      {children}
    </motion.div>
  );
}
