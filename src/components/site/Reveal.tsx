import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp } from "../../lib/motion";

/** One-shot slide-up entrance for headings and section blocks.
 *  Reduced-motion users get a static wrapper (MotionConfig reducedMotion="user"). */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds when siblings reveal together. */
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay }}
    >
      {children}
    </motion.div>
  );
}
