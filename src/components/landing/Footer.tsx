import { Mail, Phone } from "lucide-react";
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
const COLUMN = "flex flex-col items-start gap-2.5";

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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Brand */}
          <motion.div variants={staggerItem}>
            <CurtainLink
              to="/"
              className="inline-flex items-baseline gap-2 transition-opacity hover:opacity-80"
            >
              <span className="text-xl font-extrabold tracking-tighter text-white">
                ATLAS
              </span>
              <span className="text-[10px] uppercase tracking-[0.35em] text-star/60">
                Learning OS
              </span>
            </CurtainLink>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
              One surface for focus, memory, momentum and the people climbing
              beside you.
            </p>
          </motion.div>

          {/* Column 2 — Quick Links */}
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

          {/* Column 3 — Features */}
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

          {/* Column 4 — Contact */}
          <motion.div variants={staggerItem} className={COLUMN}>
            <h2 className={HEADING}>Contact</h2>
            <a
              href="mailto:hafizmzain786@gmail.com"
              className={`inline-flex items-center gap-2 ${LINK}`}
            >
              <Mail className="size-4 shrink-0 text-white/40" />
              hafizmzain786@gmail.com
            </a>
            <a
              href="tel:+923074477250"
              className={`inline-flex items-center gap-2 ${LINK}`}
            >
              <Phone className="size-4 shrink-0 text-white/40" />
              +92-3074477250
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Bottom bar ── */}
      <div className="relative z-10 mx-auto w-full max-w-[110rem] border-t border-white/10 px-6 pt-8 sm:px-10 lg:px-16">
        <div className="flex flex-col items-center justify-between gap-4 pb-8 text-xs text-white/40 sm:flex-row">
          <p>© 2026 ATLAS. All rights reserved.</p>
          <div className="flex items-center gap-6">
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
