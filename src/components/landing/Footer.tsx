import { ArrowUpRight, AtSign, Mail, MessageCircle, Video } from "lucide-react";
import SideRays from "../effects/SideRays";
import { motion } from "framer-motion";
import { CurtainLink } from "../PageCurtain";
import { EASE, fadeUp, staggerItem } from "../../lib/motion";

const LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

const LINK_CLASS =
  "group inline-flex items-center gap-1 py-2 text-sm text-white/55 transition-colors hover:text-white";

// Profile URLs are placeholders until they are supplied — only Email resolves
// to a real destination.
const SOCIALS = [
  { label: "X / Twitter", href: "#", Icon: AtSign },
  { label: "Discord", href: "#", Icon: MessageCircle },
  { label: "YouTube", href: "#", Icon: Video },
  { label: "Email", href: "mailto:hmzain2k5@gmail.com", Icon: Mail },
];

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

      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-col gap-8 px-6 py-12 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-16">
        <motion.div {...fadeUp} className="max-w-xs">
          <CurtainLink to="/" className="inline-flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tighter text-white">
              ATLAS
            </span>
            <span className="text-[10px] uppercase tracking-[0.35em] text-star/60">
              Learning OS
            </span>
          </CurtainLink>
          <p className="mt-2 text-sm leading-relaxed text-white/40">
            One surface for focus, memory, momentum and the people climbing
            beside you.
          </p>
        </motion.div>

        <motion.nav
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.07, delayChildren: 0.1 },
            },
          }}
          aria-label="Footer"
          className="flex flex-wrap gap-x-8 gap-y-3"
        >
          {LINKS.map((link) => (
            <motion.span
              key={link.label}
              variants={staggerItem}
              className="inline-flex"
            >
              <CurtainLink to={link.href} className={LINK_CLASS}>
                {link.label}
                <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
              </CurtainLink>
            </motion.span>
          ))}
        </motion.nav>

        <motion.div className="flex items-center gap-3">
          {SOCIALS.map(({ label, href, Icon }, i) => (
            <motion.a
              key={label}
              href={href}
              aria-label={label}
              initial={{ opacity: 0, y: 16, scale: 0.85 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.06, ease: EASE }}
              className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:text-white"
            >
              <Icon className="size-4" />
            </motion.a>
          ))}
        </motion.div>
      </div>

      <motion.div {...fadeUp} className="relative z-10 border-t border-white/5">
        <div className="mx-auto flex w-full max-w-[110rem] flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-white/30 sm:flex-row sm:px-10 lg:px-16">
          <p>© 2024 ATLAS. All rights reserved.</p>
          <p className="uppercase tracking-[0.25em]">Built for the climb</p>
        </div>
      </motion.div>
    </footer>
  );
}
