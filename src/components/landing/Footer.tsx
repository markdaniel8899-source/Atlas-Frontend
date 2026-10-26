import { Mail, Code2, Briefcase, MessageCircle, Users } from "lucide-react";
import SideRays from "../effects/SideRays";
import { motion } from "framer-motion";
import { CurtainLink } from "../PageCurtain";
import { staggerGroup, staggerItem } from "../../lib/motion";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const FEATURES = [
  { label: "Dashboard", to: "/app" },
  { label: "AI Chat Assistant", to: "/app/assistant" },
  { label: "Quiz Generator", to: "/app/quiz" },
  { label: "Auto Blog", to: "/blog" },
];

const BOTTOM_LINKS = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms & Conditions", to: "/terms" },
];

const HEADING =
  "text-sm font-semibold tracking-[-0.01em] text-white";
const LINK = "text-sm text-zinc-400 transition-colors hover:text-white";
const COLUMN =
  "flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left";

export function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/10 bg-[#030305]">
      {/* ── Left-side light rays ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full max-w-[42rem]"
      >
        <SideRays
          speed={2.5}
          rayColor1="#CF9EFF"
          rayColor2="#96c8ff"
          intensity={1.5}
          spread={2}
          origin="top-left"
          tilt={0}
          saturation={1.5}
          blend={0.75}
          falloff={1.6}
          opacity={0.9}
        />
      </div>

      <motion.div
        {...staggerGroup}
        className="relative z-10 mx-auto w-full max-w-[110rem] px-6 py-14 sm:px-10 lg:px-16"
      >
        {/* Desktop: one aligned 4-column row (brand | quick | features |
            contact). Mobile: brand as a horizontal top row, links in a
            2-column grid underneath (the wrapper dissolves via lg:contents). */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8">
          {/* Column 1 — Brand: stacked on mobile, logo + info side by side from sm */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left lg:block"
          >
            <CurtainLink
              to="/"
              className="inline-flex shrink-0 items-baseline gap-2 transition-opacity hover:opacity-80"
            >
              <img
                src="/formicon.png"
                alt=""
                aria-hidden="true"
                className="size-7 shrink-0 self-center object-contain"
              />
              <span className="font-create text-xl font-extrabold tracking-tighter text-white">
                ATLAS
              </span>
              <span className="text-[10px] uppercase tracking-[0.35em] text-star/60">
                Learning OS
              </span>
            </CurtainLink>
            <p className="max-w-xs text-sm leading-relaxed text-zinc-400 lg:mt-3">
              One surface for focus, memory, momentum and the people climbing
              beside you.
            </p>
          </motion.div>

          {/* Link grid: 1 column on mobile, 2 from sm, 4th-column slots on desktop */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:contents">
            <motion.nav
              variants={staggerItem}
              aria-label="Quick links"
              className={COLUMN}
            >
              <h2 className={HEADING}>Quick Links</h2>
              {QUICK_LINKS.map((link) => (
                <CurtainLink key={link.label} to={link.to} className={LINK}>
                  {link.label}
                </CurtainLink>
              ))}
            </motion.nav>

            <motion.nav
              variants={staggerItem}
              aria-label="Features"
              className={COLUMN}
            >
              <h2 className={HEADING}>Features</h2>
              {FEATURES.map((feature) => (
                <CurtainLink
                  key={feature.label}
                  to={feature.to}
                  className={LINK}
                >
                  {feature.label}
                </CurtainLink>
              ))}
            </motion.nav>

            <motion.div
              variants={staggerItem}
              className={`sm:col-span-2 lg:col-span-1 ${COLUMN}`}
            >
              <h2 className={HEADING}>Connect</h2>
              <a
                href="mailto:hafizmzain786@gmail.com"
                className={`inline-flex items-center gap-2 ${LINK}`}
              >
                <Mail className="size-4 shrink-0 text-white/40" />
                hafizmzain786@gmail.com
              </a>
              <div className="flex items-center gap-3 mt-3">
                <a
                  href="https://github.com/markdaniel8899-source"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center size-9 rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-[#cf9eff]/50 hover:bg-white/[0.06] hover:text-white"
                  aria-label="GitHub"
                >
                  <Code2 className="size-4" />
                </a>
                <a
                  href="https://x.com/markdaniel8899"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center size-9 rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-[#cf9eff]/50 hover:bg-white/[0.06] hover:text-white"
                  aria-label="Twitter"
                >
                  <MessageCircle className="size-4" />
                </a>
                <a
                  href="https://linkedin.com/in/markdaniel8899"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center size-9 rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-[#cf9eff]/50 hover:bg-white/[0.06] hover:text-white"
                  aria-label="LinkedIn"
                >
                  <Briefcase className="size-4" />
                </a>
                <a
                  href="https://discord.gg/atlas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center size-9 rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-[#cf9eff]/50 hover:bg-white/[0.06] hover:text-white"
                  aria-label="Discord"
                >
                  <Users className="size-4" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom bar ── */}
      <div className="relative z-10 mx-auto w-full max-w-[110rem] border-t border-white/10 px-6 pt-8 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 pb-24 text-center text-xs text-white/40 sm:flex-row sm:pb-8 sm:text-left">
          <p>© 2026 ATLAS. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {BOTTOM_LINKS.map((link) => (
              <CurtainLink
                key={link.label}
                to={link.to}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </CurtainLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
