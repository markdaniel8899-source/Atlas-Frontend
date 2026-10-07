import { motion, useMotionTemplate, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

interface WordProps {
  word: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}

function Word({ word, progress, start, end }: WordProps) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [34, 0]);
  const blur = useTransform(progress, [start, end], [10, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.span
      className="mr-[0.28em] inline-block"
      style={{ opacity, y, filter }}
    >
      {word}
    </motion.span>
  );
}

interface ScrollWordsProps {
  text: string;
  progress: MotionValue<number>;
  className?: string;
}

export function ScrollWords({ text, progress, className = "" }: ScrollWordsProps) {
  const words = text.split(" ");
  const span = 0.55;

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => {
        const start = (i / words.length) * span;
        return (
          <Word
            key={`${word}-${i}`}
            word={word}
            progress={progress}
            start={start}
            end={start + (1 - span)}
          />
        );
      })}
    </span>
  );
}
