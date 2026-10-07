import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../lib/motion";

interface RevealTextProps {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  /** Hold the words hidden until the curtain has opened. */
  play?: boolean;
}

export function RevealText({
  text,
  className = "",
  delay = 0,
  as = "span",
  play = true,
}: RevealTextProps) {
  const reduced = useReducedMotion();
  const words = text.split(" ");
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial="hidden"
      animate={play ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.09, delayChildren: delay },
        },
      }}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span
          key={`${word}-${wi}`}
          className="mr-[0.28em] inline-block overflow-hidden pb-[0.16em] align-bottom"
        >
          <motion.span
            className="inline-block whitespace-nowrap"
            variants={{
              hidden: reduced ? { opacity: 0 } : { y: "135%" },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.85, ease: EASE },
              },
            }}
          >
            {word.split("").map((ch, ci) => (
              <motion.span
                key={ci}
                className="inline-block"
                variants={{
                  hidden: reduced
                    ? { opacity: 0 }
                    : { opacity: 0, filter: "blur(14px)" },
                  visible: {
                    opacity: 1,
                    filter: "blur(0px)",
                    transition: {
                      duration: 0.65,
                      ease: EASE,
                      delay: ci * 0.02,
                    },
                  },
                }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
