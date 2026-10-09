import { motion, useScroll, useTransform } from "framer-motion";
import { ChartLine, FileText, Layers } from "lucide-react";
import { ScrollWords } from "../ScrollWords";
import { useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";
import DitherVeil from "../effects/DitherVeil";
// Bundled locally: incognito has a cold cache, so the third-party Unsplash
// fetch was slow/failed and the veil stayed blank (it only draws once the
// image loads). Same-origin asset = no CDN dependency, no CORS-taint risk.
import ditherProblemImage from "../../assets/dither-problem.jpg";

const PAINS = [
  {
    icon: Layers,
    title: "Tabs everywhere",
    body: "Too many platforms and no way to find where you stopped.",
  },
  {
    icon: FileText,
    title: "Notes that vanish",
    body: "Great insights die in docs and nobody reopens them.",
  },
  {
    icon: ChartLine,
    title: "Invisible progress",
    body: "No proof that your study hours are actually working.",
  },
];

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 30%"],
  });
  const { scrollYProgress: panelProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  const panelY = useTransform(panelProgress, [0, 1], [120, -40]);
  const panelRotate = useTransform(panelProgress, [0, 1], [-4, 4]);
  // Scroll transition: the artwork fades up with its parallax slide instead
  // of popping in fully lit the moment it enters the viewport.
  const panelOpacity = useTransform(panelProgress, [0, 0.22], [0, 1]);

  return (
    <div
      ref={ref}
      className="relative z-10 flex h-full flex-col justify-center gap-8 px-6 sm:px-10 lg:px-16"
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-8">
          <div className="max-w-3xl">
            <ScrollReveal distance={36} exit>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-star/70 sm:tracking-[0.45em]">
                The problem
              </p>
            </ScrollReveal>
            <h2 className="mt-4 text-4xl font-extrabold leading-[0.95] tracking-tighter text-white sm:text-5xl lg:text-6xl">
              <ScrollWords
                text="Learning feels messy? We make it simple."
                progress={scrollYProgress}
              />
            </h2>
            <ScrollReveal distance={44} exit className="mt-4 max-w-xl">
              <p className="text-[13px] leading-relaxed text-white/50 sm:text-sm">
                You have too many tabs, notes, and videos. ATLAS brings
                everything together in one place so you can focus on learning.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-8 sm:grid-cols-3">
            {PAINS.map((pain, i) => (
              <ScrollReveal
                key={pain.title}
                from={i * 0.2}
                to={i * 0.2 + 0.6}
                distance={56}
                scale={0.9}
                exit
                className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md sm:gap-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
              >
                <pain.icon
                  className="size-6 text-star [filter:drop-shadow(0_0_10px_rgba(157,180,255,0.6))_drop-shadow(0_0_22px_rgba(139,110,255,0.35))]"
                  strokeWidth={1.75}
                />
                <h3 className="text-[15px] font-bold text-white sm:text-base">
                  {pain.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-white/45 sm:text-sm">
                  {pain.body}
                </p>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal distance={44} exit>
            <p className="text-sm text-white/60 sm:text-base">
              <span className="text-white">ATLAS keeps everything in one place.</span>{" "}
              Your lessons, notes, timer, and friends all live in one simple app.
            </p>
          </ScrollReveal>
        </div>

        <motion.div
          style={{
            y: panelY,
            rotate: panelRotate,
            opacity: panelOpacity,
          }}
          role="img"
          aria-label="Dithered portrait illustration representing scattered study material coming into focus"
          className="mt-16 h-[22rem] w-full overflow-hidden rounded-2xl sm:mt-24 sm:h-[26rem] lg:mt-0 lg:h-[28rem] lg:overflow-visible lg:rounded-none xl:h-[32rem]"
        >
          <DitherVeil
            src={ditherProblemImage}
            pattern="floyd"
            pixelSize={2}
            inkColor="#120f17"
            paperColor="#f4f1ea"
            revealRadius={200}
            softness={0.6}
            linger={1}
            fit="contain"
            bgKey={0.12}
            bgKeySoft={0.14}
            rimColor="#a78bfa"
            palette="duotone"
            levels={2}
            contrast={1.15}
            brightness={0}
            rim={0}
            reverse={false}
            wander
            clickBurst
          />
        </motion.div>
      </div>
    </div>
  );
}
