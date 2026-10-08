import { useRef } from "react";
import { useScroll } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { curtainNavigate } from "../PageCurtain";
import { Button } from "../ui/Button";
import { ScrollWords } from "../ScrollWords";
import { ScrollReveal } from "./ScrollReveal";
import Ferrofluid from "../effects/Ferrofluid";

const FERRO_COLORS = ["#CF9EFF", "#CF9EFF", "#CF9EFF"];

const STATS = [
  { value: "12 min", label: "average setup time" },
  { value: "1 OS", label: "instead of six tabs" },
  { value: "24/7", label: "offline focus timer" },
  { value: "Free", label: "while in beta" },
];

export function CtaSection() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 45%"],
  });

  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-[#04040a]">
      <div aria-hidden="true" className="absolute inset-0 max-sm:max-h-screen">
        <Ferrofluid
          colors={FERRO_COLORS}
          speed={0.1}
          scale={1.6}
          turbulence={1.35}
          fluidity={0.1}
          rimWidth={0.2}
          sharpness={1.4}
          shimmer={1.5}
          glow={2.2}
          flowDirection="down"
          opacity={1}
          mouseInteraction
          mouseStrength={0.7}
          mouseRadius={0.3}
        />
      </div>

      <div className="pointer-events-none relative mx-auto flex min-h-[100svh] w-full max-w-[110rem] flex-col justify-center gap-10 px-6 py-20 sm:min-h-[110vh] sm:gap-12 sm:px-10 sm:py-28 lg:px-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
          <div>
            <ScrollReveal distance={36} exit>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-star/70 sm:tracking-[0.45em]">
                Your move
              </p>
            </ScrollReveal>
            <h2 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tighter text-white sm:text-6xl lg:text-7xl">
              <ScrollWords
                text="The mountain isn't going to climb itself."
                progress={scrollYProgress}
              />
            </h2>
          </div>

          <ScrollReveal
            distance={56}
            scale={0.94}
            exit
            className="flex flex-col items-start gap-6 lg:items-end"
          >
            <p className="max-w-sm text-sm leading-relaxed text-white/60">
              Create your account and log your first focus session in under a
              minute. No card, no config, no twelve open tabs.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button
                onClick={() => curtainNavigate(navigate, "/login")}
                className="pointer-events-auto w-full justify-center px-8 py-3.5 sm:w-auto sm:px-9"
              >
                Create your account
                <ArrowRight className="size-4" />
              </Button>
              <span className="flex items-center gap-2 text-xs text-white/40 sm:text-sm">
                <Check className="size-3.5 text-emerald-300" />
                Takes less than a minute.
              </span>
            </div>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <ScrollReveal
              key={stat.label}
              from={i * 0.16}
              to={i * 0.16 + 0.6}
              distance={48}
              scale={0.92}
              exit
              className="px-5 py-6 sm:px-6 sm:py-7"
            >
              <p className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs text-white/45">{stat.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
